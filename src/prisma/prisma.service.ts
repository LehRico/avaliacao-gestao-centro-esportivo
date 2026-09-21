import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.get<string>('database.url'),
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conectado ao PostgreSQL via Prisma');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
