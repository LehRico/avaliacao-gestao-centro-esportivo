import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { SetResultDto } from './dto/set-result.dto';
import { QueryMatchDto } from './dto/query-match.dto';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';

const CREATION_ALLOWED_TOURNAMENT_STATUSES = ['OPEN', 'IN_PROGRESS'];

const RESULT_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELED'],
  IN_PROGRESS: ['FINISHED', 'CANCELED'],
  FINISHED: [],
  CANCELED: [],
};

const matchWithRelations = {
  include: {
    tournament: { select: { id: true, name: true, status: true } },
    court: { select: { id: true, name: true } },
    teamA: { select: { id: true, name: true } },
    teamB: { select: { id: true, name: true } },
  },
} satisfies Prisma.MatchDefaultArgs;

/**
 * Se a quadra da partida foi excluída (courtId nulo), expõe o nome
 * preservado em courtName no lugar da relação, mantendo o mesmo
 * formato { id, name } que o frontend já consome.
 */
function withCourtFallback<T extends { court: { id: string; name: string } | null; courtName: string | null }>(
  match: T,
) {
  if (match.court) return match;
  return { ...match, court: { id: null, name: match.courtName } };
}

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tournamentId: string,
    dto: CreateMatchDto,
    currentUser: { userId: string; role: string },
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Torneio não encontrado.');
    }

    this.assertOrganizerOrAdmin(tournament.organizerId, currentUser);

    if (!CREATION_ALLOWED_TOURNAMENT_STATUSES.includes(tournament.status)) {
      throw new ConflictException(
        `Não é possível criar partidas quando o torneio está com status ${tournament.status}.`,
      );
    }

    if (dto.teamAId === dto.teamBId) {
      throw new ConflictException(
        'Uma equipe não pode enfrentar ela mesma.',
      );
    }

    const court = await this.prisma.court.findUnique({
      where: { id: dto.courtId },
    });

    if (!court) {
      throw new NotFoundException('Quadra não encontrada.');
    }

    await this.assertTeamsRegistered(tournamentId, [dto.teamAId, dto.teamBId]);

    const scheduledAt = new Date(dto.scheduledAt);
    const durationMin = dto.durationMin ?? 60;

    await this.assertNoCourtOverlap(dto.courtId, scheduledAt, durationMin);

    const created = await this.prisma.match.create({
      data: {
        tournamentId,
        courtId: dto.courtId,
        teamAId: dto.teamAId,
        teamBId: dto.teamBId,
        scheduledAt,
        durationMin,
      },
      ...matchWithRelations,
    });

    return withCourtFallback(created);
  }

  async findAll(query: QueryMatchDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MatchWhereInput = {
      ...(query.tournamentId ? { tournamentId: query.tournamentId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.match.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        ...matchWithRelations,
      }),
      this.prisma.match.count({ where }),
    ]);

    return {
      data: data.map(withCourtFallback),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      ...matchWithRelations,
    });

    if (!match) {
      throw new NotFoundException('Partida não encontrada.');
    }

    return withCourtFallback(match);
  }

  async update(
    id: string,
    dto: UpdateMatchDto,
    currentUser: { userId: string; role: string },
  ) {
    const match = await this.getMatchWithTournament(id);
    this.assertOrganizerOrAdmin(match.tournament.organizerId, currentUser);

    if (match.status !== 'SCHEDULED') {
      throw new ConflictException(
        'Só é possível reagendar partidas que ainda não começaram.',
      );
    }

    if (!dto.courtId && !match.courtId) {
      throw new ConflictException(
        'Esta partida não possui mais uma quadra vinculada; informe courtId para reagendá-la.',
      );
    }

    const courtId = dto.courtId ?? (match.courtId as string);
    const scheduledAt = dto.scheduledAt
      ? new Date(dto.scheduledAt)
      : match.scheduledAt;

    if (dto.courtId) {
      const court = await this.prisma.court.findUnique({
        where: { id: dto.courtId },
      });

      if (!court) {
        throw new NotFoundException('Quadra não encontrada.');
      }
    }

    if (dto.courtId || dto.scheduledAt) {
      await this.assertNoCourtOverlap(
        courtId,
        scheduledAt,
        match.durationMin,
        id,
      );
    }

    const updated = await this.prisma.match.update({
      where: { id },
      data: { courtId, scheduledAt },
      ...matchWithRelations,
    });

    return withCourtFallback(updated);
  }

  async updateStatus(
    id: string,
    status: string,
    currentUser: { userId: string; role: string },
  ) {
    const match = await this.getMatchWithTournament(id);
    this.assertOrganizerOrAdmin(match.tournament.organizerId, currentUser);

    const allowedNext = RESULT_ALLOWED_TRANSITIONS[match.status] ?? [];

    if (!allowedNext.includes(status)) {
      throw new ConflictException(
        `Não é possível mudar o status de ${match.status} para ${status}.`,
      );
    }

    const updated = await this.prisma.match.update({
      where: { id },
      data: { status: status as Prisma.MatchUpdateInput['status'] },
      ...matchWithRelations,
    });

    return withCourtFallback(updated);
  }

  async setResult(
    id: string,
    dto: SetResultDto,
    currentUser: { userId: string; role: string },
  ) {
    const match = await this.getMatchWithTournament(id);
    this.assertOrganizerOrAdmin(match.tournament.organizerId, currentUser);

    if (match.status !== 'IN_PROGRESS') {
      throw new ConflictException(
        'O resultado só pode ser lançado quando a partida está em andamento.',
      );
    }

    const updated = await this.prisma.match.update({
      where: { id },
      data: {
        scoreA: dto.scoreA,
        scoreB: dto.scoreB,
        status: 'FINISHED',
      },
      ...matchWithRelations,
    });

    return withCourtFallback(updated);
  }

  async remove(id: string, currentUser: { userId: string; role: string }) {
    const match = await this.getMatchWithTournament(id);
    this.assertOrganizerOrAdmin(match.tournament.organizerId, currentUser);

    if (match.status !== 'SCHEDULED') {
      throw new ConflictException(
        'Só é possível excluir partidas que ainda não começaram.',
      );
    }

    return this.prisma.match.delete({ where: { id } });
  }

  private async getMatchWithTournament(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: { tournament: true },
    });

    if (!match) {
      throw new NotFoundException('Partida não encontrada.');
    }

    return match;
  }

  private async assertTeamsRegistered(tournamentId: string, teamIds: string[]) {
    for (const teamId of teamIds) {
      const team = await this.prisma.team.findUnique({ where: { id: teamId } });

      if (!team) {
        throw new NotFoundException(`Time ${teamId} não encontrado.`);
      }

      const registration = await this.prisma.tournamentTeam.findUnique({
        where: { tournamentId_teamId: { tournamentId, teamId } },
      });

      if (!registration) {
        throw new ConflictException(
          `O time "${team.name}" não está inscrito neste torneio.`,
        );
      }
    }
  }

  private async assertNoCourtOverlap(
    courtId: string,
    scheduledAt: Date,
    durationMin: number,
    excludeMatchId?: string,
  ) {
    const newStart = scheduledAt.getTime();
    const newEnd = newStart + durationMin * 60_000;

    const existingMatches = await this.prisma.match.findMany({
      where: {
        courtId,
        status: { not: 'CANCELED' },
        ...(excludeMatchId ? { id: { not: excludeMatchId } } : {}),
      },
    });

    for (const existing of existingMatches) {
      const existingStart = existing.scheduledAt.getTime();
      const existingEnd = existingStart + existing.durationMin * 60_000;

      const overlaps = newStart < existingEnd && newEnd > existingStart;

      if (overlaps) {
        throw new ConflictException(
          'Esta quadra já possui uma partida agendada que se sobrepõe a este horário.',
        );
      }
    }
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
}
