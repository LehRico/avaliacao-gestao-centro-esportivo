import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getPrisma } from './test-app';
import { cleanDatabase } from './cleanup';
import { createUser } from './auth-helper';

describe('Authorization (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(getPrisma(app));
    await app.close();
  });

  // Cenário obrigatório 4: usuário autenticado sem permissão -> 403
  it('deve rejeitar usuário comum tentando listar todos os usuários (403)', async () => {
    const user = await createUser(app, 'USER');

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(403);
  });

  it('deve permitir que ADMIN liste todos os usuários (200)', async () => {
    const admin = await createUser(app, 'ADMIN');

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Cenário obrigatório 7: tentativa de acesso a recurso de terceiro
  it('deve impedir que um usuário edite o time de outro usuário (403)', async () => {
    const owner = await createUser(app, 'USER');
    const intruder = await createUser(app, 'USER');
    const admin = await createUser(app, 'ADMIN');

    const sportResponse = await request(app.getHttpServer())
      .post('/sports')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: `Esporte ${Date.now()}` });

    const teamResponse = await request(app.getHttpServer())
      .post('/teams')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Time do Dono', sportId: sportResponse.body.id });

    const teamId = teamResponse.body.id;

    const attackResponse = await request(app.getHttpServer())
      .patch(`/teams/${teamId}`)
      .set('Authorization', `Bearer ${intruder.token}`)
      .send({ name: 'Nome Alterado Por Terceiro' });

    expect(attackResponse.status).toBe(403);

    const confirmResponse = await request(app.getHttpServer()).get(
      `/teams/${teamId}`,
    );
    expect(confirmResponse.body.name).toBe('Time do Dono');
  });

  it('deve impedir que um usuário use o próprio ID para se passar por outro em operação "me" (usa identidade do token, não da URL)', async () => {
    const userA = await createUser(app, 'USER');
    const userB = await createUser(app, 'USER');

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${userA.token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(userA.id);
    expect(response.body.id).not.toBe(userB.id);
  });
});
