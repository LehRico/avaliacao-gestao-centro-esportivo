import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = 'senha12345';

async function main() {
  console.log('Iniciando seed...');

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@centroesportivo.com' },
    update: {},
    create: {
      name: 'Administrador Geral',
      email: 'admin@centroesportivo.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: 'organizador@centroesportivo.com' },
    update: {},
    create: {
      name: 'Carlos Organizador',
      email: 'organizador@centroesportivo.com',
      passwordHash,
      role: 'ORGANIZER',
    },
  });

  const userA = await prisma.user.upsert({
    where: { email: 'ana@centroesportivo.com' },
    update: {},
    create: {
      name: 'Ana Silva',
      email: 'ana@centroesportivo.com',
      passwordHash,
      role: 'USER',
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: 'bruno@centroesportivo.com' },
    update: {},
    create: {
      name: 'Bruno Souza',
      email: 'bruno@centroesportivo.com',
      passwordHash,
      role: 'USER',
    },
  });

  console.log('Usuários criados:', {
    admin: admin.email,
    organizer: organizer.email,
    userA: userA.email,
    userB: userB.email,
  });

  const futsal = await prisma.sport.upsert({
    where: { name: 'Futsal' },
    update: {},
    create: { name: 'Futsal' },
  });

  const volei = await prisma.sport.upsert({
    where: { name: 'Vôlei' },
    update: {},
    create: { name: 'Vôlei' },
  });

  console.log('Esportes criados:', futsal.name, volei.name);

  const courtNames = ['Quadra Central', 'Quadra Coberta 1', 'Quadra Coberta 2'];
  const courts: Awaited<ReturnType<typeof prisma.court.create>>[] = [];
  for (const name of courtNames) {
    const existing = await prisma.court.findFirst({ where: { name } });
    const court =
      existing ??
      (await prisma.court.create({
        data: { name, location: 'Bloco A' },
      }));
    courts.push(court);
  }

  console.log('Quadras criadas:', courts.map((c) => c.name).join(', '));

  let teamA = await prisma.team.findUnique({
    where: { ownerId_name: { ownerId: userA.id, name: 'Time do Bairro FC' } },
  });
  if (!teamA) {
    teamA = await prisma.team.create({
      data: {
        name: 'Time do Bairro FC',
        ownerId: userA.id,
        sportId: futsal.id,
        members: { create: { userId: userA.id, role: 'CAPTAIN' } },
      },
    });
  }

  let teamB = await prisma.team.findUnique({
    where: { ownerId_name: { ownerId: userB.id, name: 'Estrelas do Futsal' } },
  });
  if (!teamB) {
    teamB = await prisma.team.create({
      data: {
        name: 'Estrelas do Futsal',
        ownerId: userB.id,
        sportId: futsal.id,
        members: { create: { userId: userB.id, role: 'CAPTAIN' } },
      },
    });
  }

  console.log('Times criados:', teamA.name, teamB.name);

  let tournament = await prisma.tournament.findFirst({
    where: { name: 'Copa Centro Esportivo 2027' },
  });
  if (!tournament) {
    tournament = await prisma.tournament.create({
      data: {
        name: 'Copa Centro Esportivo 2027',
        sportId: futsal.id,
        organizerId: organizer.id,
        status: 'OPEN',
        startDate: new Date('2027-03-01T10:00:00.000Z'),
        endDate: new Date('2027-03-15T18:00:00.000Z'),
      },
    });
  }

  console.log('Torneio criado:', tournament.name, `(status: ${tournament.status})`);

  await prisma.tournamentTeam.upsert({
    where: {
      tournamentId_teamId: { tournamentId: tournament.id, teamId: teamA.id },
    },
    update: {},
    create: { tournamentId: tournament.id, teamId: teamA.id },
  });

  await prisma.tournamentTeam.upsert({
    where: {
      tournamentId_teamId: { tournamentId: tournament.id, teamId: teamB.id },
    },
    update: {},
    create: { tournamentId: tournament.id, teamId: teamB.id },
  });

  console.log('Times inscritos no torneio.');

  const existingMatch = await prisma.match.findFirst({
    where: { tournamentId: tournament.id },
  });
  if (!existingMatch) {
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        courtId: courts[0].id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        scheduledAt: new Date('2027-03-05T14:00:00.000Z'),
        durationMin: 60,
      },
    });
  }

  console.log('Partida agendada.');

  console.log('\nSeed concluído com sucesso.');
  console.log('\nCredenciais de acesso (senha para todos: ' + SEED_PASSWORD + '):');
  console.log('  ADMIN:      admin@centroesportivo.com');
  console.log('  ORGANIZER:  organizador@centroesportivo.com');
  console.log('  USER (A):   ana@centroesportivo.com');
  console.log('  USER (B):   bruno@centroesportivo.com');
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
