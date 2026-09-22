import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { QueryTeamDto } from './dto/query-team.dto';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';

const teamWithMembers = {
  include: {
    sport: true,
    owner: { select: { id: true, name: true, email: true } },
    members: {
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    },
  },
} satisfies Prisma.TeamDefaultArgs;

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateTeamDto) {
    const sport = await this.prisma.sport.findUnique({
      where: { id: dto.sportId },
    });

    if (!sport) {
      throw new NotFoundException('Esporte não encontrado.');
    }

    const existing = await this.prisma.team.findUnique({
      where: { ownerId_name: { ownerId, name: dto.name } },
    });

    if (existing) {
      throw new ConflictException('Você já possui um time com esse nome.');
    }

    return this.prisma.team.create({
      data: {
        name: dto.name,
        ownerId,
        sportId: dto.sportId,
        members: {
          create: { userId: ownerId, role: 'CAPTAIN' },
        },
      },
      ...teamWithMembers,
    });
  }

  async findAll(query: QueryTeamDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TeamWhereInput = query.sportId
      ? { sportId: query.sportId }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        ...teamWithMembers,
      }),
      this.prisma.team.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      ...teamWithMembers,
    });

    if (!team) {
      throw new NotFoundException('Time não encontrado.');
    }

    return team;
  }

  async update(
    id: string,
    dto: UpdateTeamDto,
    currentUser: { userId: string; role: string },
  ) {
    const team = await this.findOne(id);
    this.assertOwnerOrAdmin(team.ownerId, currentUser);

    return this.prisma.team.update({
      where: { id },
      data: dto,
      ...teamWithMembers,
    });
  }

  async remove(id: string, currentUser: { userId: string; role: string }) {
    const team = await this.findOne(id);
    this.assertOwnerOrAdmin(team.ownerId, currentUser);

    try {
      return await this.prisma.team.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível excluir este time pois há inscrições em torneios ou partidas vinculadas a ele.',
        );
      }

      throw error;
    }
  }

  async addMember(
    teamId: string,
    dto: AddMemberDto,
    currentUser: { userId: string; role: string },
  ) {
    const team = await this.findOne(teamId);
    this.assertOwnerOrAdmin(team.ownerId, currentUser);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException(
        'Usuário com esse e-mail não foi encontrado.',
      );
    }

    const existingMember = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    });

    if (existingMember) {
      throw new ConflictException('Este usuário já é membro do time.');
    }

    await this.prisma.teamMember.create({
      data: { teamId, userId: user.id, role: 'MEMBER' },
    });

    return this.findOne(teamId);
  }

  async removeMember(
    teamId: string,
    memberUserId: string,
    currentUser: { userId: string; role: string },
  ) {
    const team = await this.findOne(teamId);
    this.assertOwnerOrAdmin(team.ownerId, currentUser);

    if (memberUserId === team.ownerId) {
      throw new ConflictException(
        'O dono do time não pode ser removido. Exclua o time caso deseje encerrá-lo.',
      );
    }

    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: memberUserId } },
    });

    if (!member) {
      throw new NotFoundException('Membro não encontrado neste time.');
    }

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: memberUserId } },
    });

    return this.findOne(teamId);
  }

  private assertOwnerOrAdmin(
    ownerId: string,
    currentUser: { userId: string; role: string },
  ) {
    if (currentUser.role === 'ADMIN') {
      return;
    }

    if (currentUser.userId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o dono do time pode realizar esta operação.',
      );
    }
  }
}
