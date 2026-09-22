import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { ExternalModule } from '../external/external.module';

@Module({
  imports: [ExternalModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
