import { INestApplication } from '@nestjs/common';
import { req } from './request';
import { createTestApp, getPrisma } from './test-app';
import { cleanDatabase } from './cleanup';
import { createUser } from './auth-helper';

describe('Pagination and filters (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(getPrisma(app));
    await app.close();
  });

  it('deve paginar a listagem de times com meta correto', async () => {
    const admin = await createUser(app, 'ADMIN');

    const sportResponse = await req(app)
      .post('/sports')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: `Esporte Paginacao ${Date.now()}` });
    const sportId = sportResponse.body.id;

    for (let i = 1; i <= 3; i++) {
      const owner = await createUser(app, 'USER');
      await req(app)
        .post('/teams')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ name: `Time Paginado ${i} ${Date.now()}`, sportId });
    }

    const response = await req(app).get(
      `/teams?sportId=${sportId}&limit=2&page=1`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const secondPage = await req(app).get(
      `/teams?sportId=${sportId}&limit=2&page=2`,
    );
    expect(secondPage.body.data).toHaveLength(1);
    expect(secondPage.body.meta.page).toBe(2);
  });

  it('deve rejeitar limit acima do máximo permitido (400)', async () => {
    const response = await req(app).get(
      '/teams?limit=500',
    );

    expect(response.status).toBe(400);
  });

  it('deve filtrar torneios por status', async () => {
    const admin = await createUser(app, 'ADMIN');
    const organizer = await createUser(app, 'ORGANIZER');

    const sportResponse = await req(app)
      .post('/sports')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: `Esporte Filtro Status ${Date.now()}` });

    const draftTournament = await req(app)
      .post('/tournaments')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({
        name: 'Torneio Draft',
        sportId: sportResponse.body.id,
        startDate: '2028-01-01T10:00:00.000Z',
        endDate: '2028-01-10T18:00:00.000Z',
      });

    const openTournament = await req(app)
      .post('/tournaments')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({
        name: 'Torneio Open',
        sportId: sportResponse.body.id,
        startDate: '2028-02-01T10:00:00.000Z',
        endDate: '2028-02-10T18:00:00.000Z',
      });
    await req(app)
      .patch(`/tournaments/${openTournament.body.id}/status`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ status: 'OPEN' });

    const response = await req(app).get(
      `/tournaments?sportId=${sportResponse.body.id}&status=OPEN`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(openTournament.body.id);
    expect(
      response.body.data.some((t: { id: string }) => t.id === draftTournament.body.id),
    ).toBe(false);
  });
});
