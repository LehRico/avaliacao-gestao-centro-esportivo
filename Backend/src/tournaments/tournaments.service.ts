import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { RegisterTeamDto } from './dto/register-team.dto';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['OPEN', 'CANCELED'],
  OPEN: ['IN_PROGRESS', 'CANCELED'],
  IN_PROGRESS: ['FINISHED', 'CANCELED'],
  FINISHED: [],
  CANCELED: [],
};

const REGISTRATION_ALLOWED_STATUSES = ['DRAFT', 'OPEN'];

const tournamentWithRelations = {
  include: {
    sport: true,
    organizer: { select: { id: true, name: true, email: true } },
    teams: {
      include: {
        team: { select: { id: true, name: true, ownerId: true } },
      },
    },
  },
} satisfies Prisma.TournamentDefaultArgs;

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizerId: string, dto: CreateTournamentDto) {
    const sport = await this.prisma.sport.findUnique({
      where: { id: dto.sportId },
    });

    if (!sport) {
      throw new NotFoundException('Esporte não encontrado.');
    }

    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new ConflictException(
        'A data de término deve ser posterior à data de início.',
      );
    }

    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        sportId: dto.sportId,
        organizerId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      ...tournamentWithRelations,
    });
  }

  findAll() {
    return this.prisma.tournament.findMany({
      orderBy: { startDate: 'desc' },
      ...tournamentWithRelations,
    });
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      ...tournamentWithRelations,
    });

    if (!tournament) {
      throw new NotFoundException('Torneio não encontrado.');
    }

    return tournament;
  }

  async update(
    id: string,
    dto: UpdateTournamentDto,
    currentUser: { userId: string; role: string },
  ) {
    const tournament = await this.findOne(id);
    this.assertOrganizerOrAdmin(tournament.organizerId, currentUser);

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : tournament.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : tournament.endDate;

    if (endDate <= startDate) {
      throw new ConflictException(
        'A data de término deve ser posterior à data de início.',
      );
    }

    return this.prisma.tournament.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? startDate : undefined,
        endDate: dto.endDate ? endDate : undefined,
      },
      ...tournamentWithRelations,
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateTournamentStatusDto,
    currentUser: { userId: string; role: string },
  ) {
    const tournament = await this.findOne(id);
    this.assertOrganizerOrAdmin(tournament.organizerId, currentUser);

    const allowedNextStatuses = ALLOWED_TRANSITIONS[tournament.status] ?? [];

    if (!allowedNextStatuses.includes(dto.status)) {
      throw new ConflictException(
        `Não é possível mudar o status de ${tournament.status} para ${dto.status}.`,
      );
    }

    return this.prisma.tournament.update({
      where: { id },
      data: { status: dto.status },
      ...tournamentWithRelations,
    });
  }

  async remove(id: string, currentUser: { userId: string; role: string }) {
    const tournament = await this.findOne(id);
    this.assertOrganizerOrAdmin(tournament.organizerId, currentUser);

    try {
      return await this.prisma.tournament.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível excluir este torneio pois há partidas vinculadas a ele.',
        );
      }

      throw error;
    }
  }

  async setRegulation(
    id: string,
    filePath: string,
    currentUser: { userId: string; role: string },
  ) {
    const tournament = await this.findOne(id);
    this.assertOrganizerOrAdmin(tournament.organizerId, currentUser);

    return this.prisma.tournament.update({
      where: { id },
      data: { regulationPath: filePath },
      ...tournamentWithRelations,
    });
  }

  async registerTeam(
    tournamentId: string,
    dto: RegisterTeamDto,
    currentUser: { userId: string; role: string },
  ) {
    const tournament = await this.findOne(tournamentId);

    const team = await this.prisma.team.findUnique({
      where: { id: dto.teamId },
    });

    if (!team) {
      throw new NotFoundException('Time não encontrado.');
    }

    this.assertOwnerOrganizerOrAdmin(team.ownerId, currentUser);

    if (!REGISTRATION_ALLOWED_STATUSES.includes(tournament.status)) {
      throw new ConflictException(
        `Inscrições não são permitidas quando o torneio está com status ${tournament.status}.`,
      );
    }

    if (team.sportId !== tournament.sportId) {
      throw new ConflictException(
        'O esporte do time não corresponde ao esporte do torneio.',
      );
    }

    const existingRegistration = await this.prisma.tournamentTeam.findUnique({
      where: {
        tournamentId_teamId: { tournamentId, teamId: dto.teamId },
      },
    });

    if (existingRegistration) {
      throw new ConflictException('Este time já está inscrito no torneio.');
    }

    await this.prisma.tournamentTeam.create({
      data: { tournamentId, teamId: dto.teamId },
    });

    return this.findOne(tournamentId);
  }

  async unregisterTeam(
    tournamentId: string,
    teamId: string,
    currentUser: { userId: string; role: string },
  ) {
    const tournament = await this.findOne(tournamentId);

    const team = await this.prisma.team.findUnique({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException('Time não encontrado.');
    }

    this.assertOwnerOrganizerOrAdmin(team.ownerId, currentUser);

    const registration = await this.prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId } },
    });

    if (!registration) {
      throw new NotFoundException(
        'Este time não está inscrito neste torneio.',
      );
    }

    if (!REGISTRATION_ALLOWED_STATUSES.includes(tournament.status)) {
      throw new ConflictException(
        `Não é possível cancelar inscrição quando o torneio está com status ${tournament.status}.`,
      );
    }

    await this.prisma.tournamentTeam.delete({
      where: { tournamentId_teamId: { tournamentId, teamId } },
    });

    return this.findOne(tournamentId);
  }

  private assertOrganizerOrAdmin(
    organizerId: string,
    currentUser: { userId: string; role: string },
  ) {
    if (currentUser.role === 'ADMIN') {
      return;
    }

    if (currentUser.userId !== organizerId) {
      throw new ForbiddenException(
        'Apenas o organizador deste torneio pode realizar esta operação.',
      );
    }
  }

  private assertOwnerOrganizerOrAdmin(
    teamOwnerId: string,
    currentUser: { userId: string; role: string },
  ) {
    if (currentUser.role === 'ADMIN' || currentUser.role === 'ORGANIZER') {
      return;
    }

    if (currentUser.userId !== teamOwnerId) {
      throw new ForbiddenException(
        'Apenas o dono do time, um organizador ou um administrador pode gerenciar esta inscrição.',
      );
    }
  }
}
