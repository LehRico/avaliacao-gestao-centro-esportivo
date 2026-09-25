import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly selectSafeFields = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  };

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.selectSafeFields,
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: this.selectSafeFields,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRole(
    targetUserId: string,
    dto: UpdateUserRoleDto,
    currentUserId: string,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!target) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (targetUserId === currentUserId) {
      throw new ForbiddenException(
        'Não é possível alterar o próprio papel.',
      );
    }

    if (target.role === 'ADMIN') {
      throw new ForbiddenException(
        'Não é possível alterar o papel de outro administrador.',
      );
    }

    if (target.role === dto.role) {
      throw new ConflictException(
        `Este usuário já possui o papel ${dto.role}.`,
      );
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: this.selectSafeFields,
    });
  }
}
