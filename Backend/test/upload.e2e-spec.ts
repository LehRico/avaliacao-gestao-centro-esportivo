import { INestApplication } from '@nestjs/common';
import { req } from './request';
import { createTestApp, getPrisma } from './test-app';
import { cleanDatabase } from './cleanup';
import { createUser } from './auth-helper';

async function createTournament(app: INestApplication, organizerToken: string, adminToken: string) {
  const sportResponse = await req(app)
    .post('/sports')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `Esporte Upload ${Date.now()}` });

  const tournamentResponse = await req(app)
    .post('/tournaments')
    .set('Authorization', `Bearer ${organizerToken}`)
    .send({
      name: 'Torneio para Upload',
      sportId: sportResponse.body.id,
      startDate: '2027-02-01T10:00:00.000Z',
      endDate: '2027-02-10T18:00:00.000Z',
    });

  return tournamentResponse.body.id as string;
}

describe('Upload (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(getPrisma(app));
    await app.close();
  });

  // Cenário obrigatório 8 (parte 1): upload válido
  it('deve aceitar upload de PDF válido e salvar o caminho no torneio (201)', async () => {
    const admin = await createUser(app, 'ADMIN');
    const organizer = await createUser(app, 'ORGANIZER');
    const tournamentId = await createTournament(app, organizer.token, admin.token);

    const pdfBuffer = Buffer.from('%PDF-1.4\n%%EOF');

    const response = await req(app)
      .post(`/tournaments/${tournamentId}/regulation`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .attach('file', pdfBuffer, {
        filename: 'regulamento.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(201);
    expect(response.body.regulationPath).toBeTruthy();
  });

  // Cenário obrigatório 8 (parte 2): upload inválido - sem arquivo
  it('deve rejeitar upload sem nenhum arquivo (400)', async () => {
    const admin = await createUser(app, 'ADMIN');
    const organizer = await createUser(app, 'ORGANIZER');
    const tournamentId = await createTournament(app, organizer.token, admin.token);

    const response = await req(app)
      .post(`/tournaments/${tournamentId}/regulation`)
      .set('Authorization', `Bearer ${organizer.token}`);

    expect(response.status).toBe(400);
  });

  // Cenário obrigatório 8 (parte 3): upload inválido - tipo errado
  it('deve rejeitar upload de arquivo que não é PDF (400)', async () => {
    const admin = await createUser(app, 'ADMIN');
    const organizer = await createUser(app, 'ORGANIZER');
    const tournamentId = await createTournament(app, organizer.token, admin.token);

    const response = await req(app)
      .post(`/tournaments/${tournamentId}/regulation`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .attach('file', Buffer.from('conteudo texto'), {
        filename: 'documento.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
  });

  it('deve rejeitar upload por usuário que não é o organizador do torneio (403)', async () => {
    const admin = await createUser(app, 'ADMIN');
    const organizer = await createUser(app, 'ORGANIZER');
    const otherOrganizer = await createUser(app, 'ORGANIZER');
    const tournamentId = await createTournament(app, organizer.token, admin.token);

    const response = await req(app)
      .post(`/tournaments/${tournamentId}/regulation`)
      .set('Authorization', `Bearer ${otherOrganizer.token}`)
      .attach('file', Buffer.from('%PDF-1.4\n%%EOF'), {
        filename: 'regulamento.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(403);
  });
});
