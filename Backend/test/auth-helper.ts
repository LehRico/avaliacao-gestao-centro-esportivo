import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

let counter = 0;

export async function createUser(
  app: INestApplication,
  role: 'USER' | 'ORGANIZER' | 'ADMIN' = 'USER',
  password = 'senha12345',
): Promise<TestUser> {
  counter += 1;
  const email = `user${counter}.${Date.now()}@example.com`;

  const registerResponse = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ name: `Test User ${counter}`, email, password });

  const userId = registerResponse.body.user.id as string;

  if (role !== 'USER') {
    const prisma = app.get(PrismaService);
    await prisma.user.update({ where: { id: userId }, data: { role } });
  }

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password });

  return {
    id: userId,
    email,
    token: loginResponse.body.accessToken as string,
  };
}
