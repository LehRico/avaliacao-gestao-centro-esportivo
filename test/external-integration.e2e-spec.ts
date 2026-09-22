import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { of, throwError } from 'rxjs';
import { AppModule } from '../src/app.module';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { getPrisma } from './test-app';
import { cleanDatabase } from './cleanup';
import { createUser } from './auth-helper';

async function createTournamentForHolidayCheck(
  app: INestApplication,
  adminToken: string,
  organizerToken: string,
) {
  const sportResponse = await request(app.getHttpServer())
    .post('/sports')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: `Esporte Externo ${Date.now()}` });

  const tournamentResponse = await request(app.getHttpServer())
    .post('/tournaments')
    .set('Authorization', `Bearer ${organizerToken}`)
    .send({
      name: 'Torneio Integração Externa',
      sportId: sportResponse.body.id,
      startDate: '2027-03-01T10:00:00.000Z',
      endDate: '2027-03-10T18:00:00.000Z',
    });

  return tournamentResponse.body.id as string;
}

describe('External Integration (e2e)', () => {
  // Cenário obrigatório 9 (parte 1): integração externa funcionando de verdade
  describe('quando o serviço externo responde normalmente', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
      );
      app.useGlobalInterceptors(new LoggingInterceptor());
      app.useGlobalFilters(new HttpExceptionFilter());
      await app.init();
    });

    afterAll(async () => {
      await cleanDatabase(getPrisma(app));
      await app.close();
    });

    it('deve consultar feriado real via BrasilAPI e responder 200 mesmo sem feriado', async () => {
      const admin = await createUser(app, 'ADMIN');
      const organizer = await createUser(app, 'ORGANIZER');
      const tournamentId = await createTournamentForHolidayCheck(
        app,
        admin.token,
        organizer.token,
      );

      const response = await request(app.getHttpServer()).get(
        `/tournaments/${tournamentId}/holiday-check`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isHoliday');
      expect(typeof response.body.isHoliday).toBe('boolean');
    }, 15000);
  });

  // Cenário obrigatório 9 (parte 2): integração externa falhando de forma controlada
  describe('quando o serviço externo falha (mock determinístico)', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(HttpService)
        .useValue({
          get: () => throwError(() => new Error('Network unreachable (simulado)')),
        })
        .compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
      );
      app.useGlobalInterceptors(new LoggingInterceptor());
      app.useGlobalFilters(new HttpExceptionFilter());
      await app.init();
    });

    afterAll(async () => {
      await cleanDatabase(getPrisma(app));
      await app.close();
    });

    it('deve responder 200 com isHoliday indisponível quando a API de feriados falha, sem derrubar a aplicação', async () => {
      const admin = await createUser(app, 'ADMIN');
      const organizer = await createUser(app, 'ORGANIZER');
      const tournamentId = await createTournamentForHolidayCheck(
        app,
        admin.token,
        organizer.token,
      );

      const response = await request(app.getHttpServer()).get(
        `/tournaments/${tournamentId}/holiday-check`,
      );

      expect(response.status).toBe(200);
      expect(response.body.isHoliday).toBe(false);
      expect(response.body.holiday).toBeNull();
    });

    it('deve responder 200 com clima indisponível quando a API de clima falha, sem derrubar a aplicação', async () => {
      const admin = await createUser(app, 'ADMIN');
      const organizer = await createUser(app, 'ORGANIZER');

      const sportResponse = await request(app.getHttpServer())
        .post('/sports')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: `Esporte Clima ${Date.now()}` });

      const tournamentResponse = await request(app.getHttpServer())
        .post('/tournaments')
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({
          name: 'Torneio Clima',
          sportId: sportResponse.body.id,
          startDate: '2027-03-01T10:00:00.000Z',
          endDate: '2027-03-10T18:00:00.000Z',
        });

      await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentResponse.body.id}/status`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({ status: 'OPEN' });

      await request(app.getHttpServer())
        .patch(`/tournaments/${tournamentResponse.body.id}/status`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({ status: 'IN_PROGRESS' });

      const teamOwner = await createUser(app, 'USER');
      const teamAResponse = await request(app.getHttpServer())
        .post('/teams')
        .set('Authorization', `Bearer ${teamOwner.token}`)
        .send({ name: 'Time Clima A', sportId: sportResponse.body.id });
      const teamBResponse = await request(app.getHttpServer())
        .post('/teams')
        .set('Authorization', `Bearer ${teamOwner.token}`)
        .send({ name: 'Time Clima B', sportId: sportResponse.body.id });

      const prisma = getPrisma(app);
      await prisma.tournamentTeam.createMany({
        data: [
          { tournamentId: tournamentResponse.body.id, teamId: teamAResponse.body.id },
          { tournamentId: tournamentResponse.body.id, teamId: teamBResponse.body.id },
        ],
      });

      const courtResponse = await request(app.getHttpServer())
        .post('/courts')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Quadra Clima' });

      const matchResponse = await request(app.getHttpServer())
        .post(`/tournaments/${tournamentResponse.body.id}/matches`)
        .set('Authorization', `Bearer ${organizer.token}`)
        .send({
          courtId: courtResponse.body.id,
          teamAId: teamAResponse.body.id,
          teamBId: teamBResponse.body.id,
          scheduledAt: '2027-03-05T14:00:00.000Z',
        });

      const response = await request(app.getHttpServer()).get(
        `/matches/${matchResponse.body.id}/weather`,
      );

      expect(response.status).toBe(200);
      expect(response.body.weatherAvailable).toBe(false);
      expect(response.body.currentWeather).toBeNull();
    });
  });
});
