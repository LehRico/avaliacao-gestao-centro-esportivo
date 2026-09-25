import { INestApplication } from '@nestjs/common';
import { createTestApp, getPrisma } from './test-app';
import { cleanDatabase } from './cleanup';
import { req } from './request';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(getPrisma(app));
    await app.close();
  });

  // Cenário obrigatório 1: fluxo principal com sucesso
  it('deve registrar um usuário com sucesso e nunca retornar a senha (201)', async () => {
    const response = await req(app)
      .post('/auth/register')
      .send({
        name: 'Maria Silva',
        email: `maria.${Date.now()}@example.com`,
        password: 'senhaSegura123',
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.role).toBe('USER');
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('deve fazer login com sucesso e retornar token (200)', async () => {
    const email = `login.${Date.now()}@example.com`;
    await req(app)
      .post('/auth/register')
      .send({ name: 'Login Test', email, password: 'senha12345' });

    const response = await req(app)
      .post('/auth/login')
      .send({ email, password: 'senha12345' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });

  // Cenário obrigatório 2: body inválido -> 400
  it('deve rejeitar registro com body inválido (400)', async () => {
    const response = await req(app)
      .post('/auth/register')
      .send({ name: 'A', email: 'nao-e-email', password: '123' });

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.message)).toBe(true);
  });

  it('deve rejeitar tentativa de injetar role no registro (400)', async () => {
    const response = await req(app)
      .post('/auth/register')
      .send({
        name: 'Hacker',
        email: `hacker.${Date.now()}@example.com`,
        password: 'senha12345',
        role: 'ADMIN',
      });

    expect(response.status).toBe(400);
  });

  // Cenário obrigatório 3: ausência/token inválido -> 401
  it('deve rejeitar login com senha incorreta (401)', async () => {
    const email = `wrongpass.${Date.now()}@example.com`;
    await req(app)
      .post('/auth/register')
      .send({ name: 'Wrong Pass', email, password: 'senhaCorreta123' });

    const response = await req(app)
      .post('/auth/login')
      .send({ email, password: 'senhaErrada' });

    expect(response.status).toBe(401);
  });

  it('deve rejeitar acesso a rota protegida sem token (401)', async () => {
    const response = await req(app).get('/users/me');

    expect(response.status).toBe(401);
  });

  it('deve rejeitar acesso a rota protegida com token inválido (401)', async () => {
    const response = await req(app)
      .get('/users/me')
      .set('Authorization', 'Bearer token.invalido.aqui');

    expect(response.status).toBe(401);
  });

  it('deve rejeitar e-mail duplicado no registro (409)', async () => {
    const email = `duplicado.${Date.now()}@example.com`;
    await req(app)
      .post('/auth/register')
      .send({ name: 'Primeiro', email, password: 'senha12345' });

    const response = await req(app)
      .post('/auth/register')
      .send({ name: 'Segundo', email, password: 'senha12345' });

    expect(response.status).toBe(409);
  });
});
