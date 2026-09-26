import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';

@Injectable()
export class CourtsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourtDto) {
    const existing = await this.prisma.court.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException('Já existe uma quadra com esse nome.');
    }

    return this.prisma.court.create({ data: dto });
  }

  findAll() {
    return this.prisma.court.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const court = await this.prisma.court.findUnique({ where: { id } });

    if (!court) {
      throw new NotFoundException('Quadra não encontrada.');
    }

    return court;
  }

  async update(id: string, dto: UpdateCourtDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.court.findFirst({
        where: { name: { equals: dto.name, mode: 'insensitive' } },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe uma quadra com esse nome.');
      }
    }

    return this.prisma.court.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const court = await this.findOne(id);

    const activeMatch = await this.prisma.match.findFirst({
      where: { courtId: id, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
    });

    if (activeMatch) {
      throw new ConflictException(
        'Não é possível excluir esta quadra pois há partidas agendadas ou em andamento vinculadas a ela.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.match.updateMany({
        where: { courtId: id },
        data: { courtName: court.name, courtId: null },
      });

      return tx.court.delete({ where: { id } });
    });
  }
}
