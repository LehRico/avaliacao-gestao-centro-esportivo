import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';

@Injectable()
export class SportsService {
    constructor(private readonly prisma: PrismaService)  {}

    async create (dto: CreateSportDto) {
        const existing = await this.prisma.sport.findFirst({
            where: { name: { equals: dto.name, mode: 'insensitive' } },
        });

        if (existing) {
            throw new ConflictException('Já existe um esporte com esse nome.');
        }

        return this.prisma.sport.create({data:dto});
    }

    findAll(){
        return this.prisma.sport.findMany({ orderBy: {name: 'asc'} });
    }

    async findOne(id: string){
        const sport = await this.prisma.sport.findUnique({where: {id} });

        if (!sport) {
            throw new NotFoundException('Esporte não encontrado.');
        }

        return sport;
    }

    async update(id: string, dto: UpdateSportDto) {
        await this.findOne(id);

        if (dto.name) {
            const existing = await this.prisma.sport.findFirst({
                where: { name: { equals: dto.name, mode: 'insensitive' } },
            });

            if (existing && existing.id !== id) {
                throw new ConflictException('Já existe um esporte com esse nome.');
            }
        }

        return this.prisma.sport.update({ where: {id}, data: dto});
    }

    async remove(id: string) {
        await this.findOne(id);

        try {
            return await this.prisma.sport.delete({ where: {id} });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2003'
            ) {
                throw new ConflictException(
                    'Não é possível excluir este esporte pois há times ou torneios vinculados a ele.',
                );
            }

            throw error;
        }
    }
}