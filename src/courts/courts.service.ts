import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';

@Injectable()
export class CourtsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCourtDto) {
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

    return this.prisma.court.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);

    try {
      return await this.prisma.court.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Não é possível excluir esta quadra pois há partidas vinculadas a ela.',
        );
      }

      throw error;
    }
  }
}
