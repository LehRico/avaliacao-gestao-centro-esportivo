import { INestApplication } from '@nestjs/common';
import { req } from './request';
import { createTestApp, getPrisma } from './test-app';
import { cleanDatabase } from './cleanup';
import { createUser } from './auth-helper';

describe('State Flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(getPrisma(app));
    await app.close();
  });

  // Cenário obrigatório 10: fluxo completo de mudança de estado
  it('deve percorrer o ciclo completo de uma Match: SCHEDULED -> IN_PROGRESS -> resultado -> FINISHED', async () => {
    const admin = await createUser(app, 'ADMIN');
    const organizer = await createUser(app, 'ORGANIZER');
    const teamOwnerA = await createUser(app, 'USER');
    const teamOwnerB = await createUser(app, 'USER');

    const sportResponse = await req(app)
      .post('/sports')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: `Esporte Fluxo ${Date.now()}` });
    const sportId = sportResponse.body.id;

    const tournamentResponse = await req(app)
      .post('/tournaments')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({
        name: 'Torneio Fluxo Completo',
        sportId,
        startDate: '2027-04-01T10:00:00.000Z',
        endDate: '2027-04-10T18:00:00.000Z',
      });
    const tournamentId = tournamentResponse.body.id;
    expect(tournamentResponse.body.status).toBe('DRAFT');

    // DRAFT -> OPEN
    const openResponse = await req(app)
      .patch(`/tournaments/${tournamentId}/status`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ status: 'OPEN' });
    expect(openResponse.status).toBe(200);
    expect(openResponse.body.status).toBe('OPEN');

    const teamAResponse = await req(app)
      .post('/teams')
      .set('Authorization', `Bearer ${teamOwnerA.token}`)
      .send({ name: 'Time Fluxo A', sportId });
    const teamBResponse = await req(app)
      .post('/teams')
      .set('Authorization', `Bearer ${teamOwnerB.token}`)
      .send({ name: 'Time Fluxo B', sportId });

    await req(app)
      .post(`/tournaments/${tournamentId}/teams`)
      .set('Authorization', `Bearer ${teamOwnerA.token}`)
      .send({ teamId: teamAResponse.body.id });
    await req(app)
      .post(`/tournaments/${tournamentId}/teams`)
      .set('Authorization', `Bearer ${teamOwnerB.token}`)
      .send({ teamId: teamBResponse.body.id });

    // OPEN -> IN_PROGRESS
    const inProgressResponse = await req(app)
      .patch(`/tournaments/${tournamentId}/status`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ status: 'IN_PROGRESS' });
    expect(inProgressResponse.status).toBe(200);
    expect(inProgressResponse.body.status).toBe('IN_PROGRESS');

    const courtResponse = await req(app)
      .post('/courts')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Quadra Fluxo' });

    const matchResponse = await req(app)
      .post(`/tournaments/${tournamentId}/matches`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({
        courtId: courtResponse.body.id,
        teamAId: teamAResponse.body.id,
        teamBId: teamBResponse.body.id,
        scheduledAt: '2027-04-05T14:00:00.000Z',
      });
    expect(matchResponse.status).toBe(201);
    expect(matchResponse.body.status).toBe('SCHEDULED');
    const matchId = matchResponse.body.id;

    // Resultado bloqueado enquanto SCHEDULED (regra: resultado respeita estado da partida)
    const blockedResultResponse = await req(app)
      .patch(`/matches/${matchId}/result`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ scoreA: 2, scoreB: 1 });
    expect(blockedResultResponse.status).toBe(409);

    // SCHEDULED -> IN_PROGRESS
    const matchInProgressResponse = await req(app)
      .patch(`/matches/${matchId}/status`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ status: 'IN_PROGRESS' });
    expect(matchInProgressResponse.status).toBe(200);
    expect(matchInProgressResponse.body.status).toBe('IN_PROGRESS');

    // Resultado aceito, transiciona automaticamente para FINISHED
    const resultResponse = await req(app)
      .patch(`/matches/${matchId}/result`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ scoreA: 3, scoreB: 1 });
    expect(resultResponse.status).toBe(200);
    expect(resultResponse.body.status).toBe('FINISHED');
    expect(resultResponse.body.scoreA).toBe(3);
    expect(resultResponse.body.scoreB).toBe(1);

    // Estado terminal: não é mais possível reagendar
    const rescheduleResponse = await req(app)
      .patch(`/matches/${matchId}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ scheduledAt: '2027-05-01T10:00:00.000Z' });
    expect(rescheduleResponse.status).toBe(409);
  });

  it('deve rejeitar transição de status inválida no Tournament (DRAFT -> IN_PROGRESS direto)', async () => {
    const admin = await createUser(app, 'ADMIN');
    const organizer = await createUser(app, 'ORGANIZER');

    const sportResponse = await req(app)
      .post('/sports')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: `Esporte Transicao ${Date.now()}` });

    const tournamentResponse = await req(app)
      .post('/tournaments')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({
        name: 'Torneio Transição Inválida',
        sportId: sportResponse.body.id,
        startDate: '2027-06-01T10:00:00.000Z',
        endDate: '2027-06-10T18:00:00.000Z',
      });

    const response = await req(app)
      .patch(`/tournaments/${tournamentResponse.body.id}/status`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ status: 'IN_PROGRESS' });

    expect(response.status).toBe(409);
  });
});
