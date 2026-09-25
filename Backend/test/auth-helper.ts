import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { req } from './request';

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

  const registerResponse = await req(app)
    .post('/auth/register')
    .send({ name: `Test User ${counter}`, email, password });

  const userId = registerResponse.body.user.id as string;

  if (role !== 'USER') {
    const prisma = app.get(PrismaService);
    await prisma.user.update({ where: { id: userId }, data: { role } });
  }

  const loginResponse = await req(app)
    .post('/auth/login')
    .send({ email, password });

  return {
    id: userId,
    email,
    token: loginResponse.body.accessToken as string,
  };
}
