import { INestApplication } from '@nestjs/common';
import { req } from './request';
import { createTestApp, getPrisma } from './test-app';
import { cleanDatabase } from './cleanup';
import { createUser } from './auth-helper';

describe('Mandatory Business Rules (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(getPrisma(app));
    await app.close();
  });

  async function setupInProgressTournamentWithTeams() {
    const admin = await createUser(app, 'ADMIN');
    const organizer = await createUser(app, 'ORGANIZER');
    const teamOwnerA = await createUser(app, 'USER');
    const teamOwnerB = await createUser(app, 'USER');

    const sportResponse = await req(app)
      .post('/sports')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: `Esporte Regras ${Date.now()}` });
    const sportId = sportResponse.body.id;

    const tournamentResponse = await req(app)
      .post('/tournaments')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({
        name: 'Torneio Regras',
        sportId,
        startDate: '2027-07-01T10:00:00.000Z',
        endDate: '2027-07-10T18:00:00.000Z',
      });
    const tournamentId = tournamentResponse.body.id;

    await req(app)
      .patch(`/tournaments/${tournamentId}/status`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ status: 'OPEN' });

    const teamAResponse = await req(app)
      .post('/teams')
      .set('Authorization', `Bearer ${teamOwnerA.token}`)
      .send({ name: 'Time Regras A', sportId });
    const teamBResponse = await req(app)
      .post('/teams')
      .set('Authorization', `Bearer ${teamOwnerB.token}`)
      .send({ name: 'Time Regras B', sportId });

    await req(app)
      .post(`/tournaments/${tournamentId}/teams`)
      .set('Authorization', `Bearer ${teamOwnerA.token}`)
      .send({ teamId: teamAResponse.body.id });
    await req(app)
      .post(`/tournaments/${tournamentId}/teams`)
      .set('Authorization', `Bearer ${teamOwnerB.token}`)
      .send({ teamId: teamBResponse.body.id });

    await req(app)
      .patch(`/tournaments/${tournamentId}/status`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ status: 'IN_PROGRESS' });

    const courtResponse = await req(app)
      .post('/courts')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: `Quadra Regras ${Date.now()}` });

    return {
      organizerToken: organizer.token,
      tournamentId,
      teamAId: teamAResponse.body.id,
      teamBId: teamBResponse.body.id,
      courtId: courtResponse.body.id,
    };
  }

  it('regra obrigatória: uma equipe não pode enfrentar ela mesma (409)', async () => {
    const { organizerToken, tournamentId, teamAId, courtId } =
      await setupInProgressTournamentWithTeams();

    const response = await req(app)
      .post(`/tournaments/${tournamentId}/matches`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        courtId,
        teamAId,
        teamBId: teamAId,
        scheduledAt: '2027-07-05T14:00:00.000Z',
      });

    expect(response.status).toBe(409);
  });

  it('regra obrigatória: uma quadra não pode receber partidas sobrepostas (409)', async () => {
    const { organizerToken, tournamentId, teamAId, teamBId, courtId } =
      await setupInProgressTournamentWithTeams();

    const firstMatch = await req(app)
      .post(`/tournaments/${tournamentId}/matches`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        courtId,
        teamAId,
        teamBId,
        scheduledAt: '2027-07-05T14:00:00.000Z',
        durationMin: 60,
      });
    expect(firstMatch.status).toBe(201);

    const overlappingMatch = await req(app)
      .post(`/tournaments/${tournamentId}/matches`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        courtId,
        teamAId,
        teamBId,
        scheduledAt: '2027-07-05T14:30:00.000Z',
        durationMin: 60,
      });

    expect(overlappingMatch.status).toBe(409);
  });

  it('deve permitir agendamento consecutivo na mesma quadra sem sobreposição (201)', async () => {
    const { organizerToken, tournamentId, teamAId, teamBId, courtId } =
      await setupInProgressTournamentWithTeams();

    const firstMatch = await req(app)
      .post(`/tournaments/${tournamentId}/matches`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        courtId,
        teamAId,
        teamBId,
        scheduledAt: '2027-07-06T14:00:00.000Z',
        durationMin: 60,
      });
    expect(firstMatch.status).toBe(201);

    const backToBackMatch = await req(app)
      .post(`/tournaments/${tournamentId}/matches`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        courtId,
        teamAId,
        teamBId,
        scheduledAt: '2027-07-06T15:00:00.000Z',
        durationMin: 60,
      });

    expect(backToBackMatch.status).toBe(201);
  });

  it('regra: time não inscrito no torneio não pode jogar partida (409)', async () => {
    const { organizerToken, tournamentId, teamAId, courtId } =
      await setupInProgressTournamentWithTeams();

    const teamOwner = await createUser(app, 'USER');
    const sportsResponse = await req(app).get('/sports');
    const anySport = sportsResponse.body[0];

    const outsiderTeam = await req(app)
      .post('/teams')
      .set('Authorization', `Bearer ${teamOwner.token}`)
      .send({ name: `Time de Fora ${Date.now()}`, sportId: anySport.id });

    const response = await req(app)
      .post(`/tournaments/${tournamentId}/matches`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        courtId,
        teamAId,
        teamBId: outsiderTeam.body.id,
        scheduledAt: '2027-07-07T14:00:00.000Z',
      });

    expect(response.status).toBe(409);
  });
});
