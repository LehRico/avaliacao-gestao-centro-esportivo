import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getPrisma } from './test-app';
import { cleanDatabase } from './cleanup';
import { createUser } from './auth-helper';

describe('Errors - 404 and 409 (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(getPrisma(app));
    await app.close();
  });

  const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

  // Cenário obrigatório 5: recurso inexistente -> 404
  it('deve retornar 404 ao buscar Sport inexistente', async () => {
    const response = await request(app.getHttpServer()).get(
      `/sports/${NON_EXISTENT_UUID}`,
    );
    expect(response.status).toBe(404);
  });

  it('deve retornar 404 ao buscar Team inexistente', async () => {
    const response = await request(app.getHttpServer()).get(
      `/teams/${NON_EXISTENT_UUID}`,
    );
    expect(response.status).toBe(404);
  });

  it('deve retornar 404 ao buscar Tournament inexistente', async () => {
    const response = await request(app.getHttpServer()).get(
      `/tournaments/${NON_EXISTENT_UUID}`,
    );
    expect(response.status).toBe(404);
  });

  it('deve retornar 404 ao criar Team referenciando Sport inexistente', async () => {
    const user = await createUser(app, 'USER');

    const response = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Time Fantasma', sportId: NON_EXISTENT_UUID });

    expect(response.status).toBe(404);
  });

  // Cenário obrigatório 6: conflito da regra de negócio -> 409
  it('deve retornar 409 ao criar Sport com nome duplicado', async () => {
    const admin = await createUser(app, 'ADMIN');
    const name = `Vôlei ${Date.now()}`;

    await request(app.getHttpServer())
      .post('/sports')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name });

    const response = await request(app.getHttpServer())
      .post('/sports')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name });

    expect(response.status).toBe(409);
  });

  it('deve retornar 409 ao excluir Sport com Team vinculado', async () => {
    const admin = await createUser(app, 'ADMIN');
    const user = await createUser(app, 'USER');

    const sportResponse = await request(app.getHttpServer())
      .post('/sports')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: `Esporte Vinculado ${Date.now()}` });

    await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Time Vinculado', sportId: sportResponse.body.id });

    const response = await request(app.getHttpServer())
      .delete(`/sports/${sportResponse.body.id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(response.status).toBe(409);
  });

  it('deve retornar 409 ao inscrever o mesmo time duas vezes no mesmo torneio', async () => {
    const admin = await createUser(app, 'ADMIN');
    const organizer = await createUser(app, 'ORGANIZER');
    const teamOwner = await createUser(app, 'USER');

    const sportResponse = await request(app.getHttpServer())
      .post('/sports')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: `Handebol ${Date.now()}` });
    const sportId = sportResponse.body.id;

    const tournamentResponse = await request(app.getHttpServer())
      .post('/tournaments')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({
        name: 'Copa Teste',
        sportId,
        startDate: '2027-01-01T10:00:00.000Z',
        endDate: '2027-01-10T18:00:00.000Z',
      });
    const tournamentId = tournamentResponse.body.id;

    const teamResponse = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${teamOwner.token}`)
      .send({ name: 'Time Handebol', sportId });
    const teamId = teamResponse.body.id;

    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/teams`)
      .set('Authorization', `Bearer ${teamOwner.token}`)
      .send({ teamId });

    const response = await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/teams`)
      .set('Authorization', `Bearer ${teamOwner.token}`)
      .send({ teamId });

    expect(response.status).toBe(409);
  });
});
