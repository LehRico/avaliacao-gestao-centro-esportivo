import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { SetResultDto } from './dto/set-result.dto';
import { QueryMatchDto } from './dto/query-match.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { WeatherService } from '../external/weather.service';

@ApiTags('Matches')
@ApiSecurity('api-key')
@Controller()
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly weatherService: WeatherService,
  ) {}

  @Post('tournaments/:tournamentId/matches')
  @Auth('ORGANIZER', 'ADMIN')
  @ApiBearerAuth('access-token')
  create(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: CreateMatchDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.matchesService.create(tournamentId, dto, user);
  }

  @Get('tournaments/:tournamentId/matches')
  findAllByTournament(
    @Param('tournamentId') tournamentId: string,
    @Query() query: QueryMatchDto,
  ) {
    return this.matchesService.findAll({ ...query, tournamentId });
  }

  @Get('matches')
  findAll(@Query() query: QueryMatchDto) {
    return this.matchesService.findAll(query);
  }

  @Get('matches/:id')
  findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Patch('matches/:id')
  @Auth('ORGANIZER', 'ADMIN')
  @ApiBearerAuth('access-token')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMatchDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.matchesService.update(id, dto, user);
  }

  @Patch('matches/:id/status')
  @Auth('ORGANIZER', 'ADMIN')
  @ApiBearerAuth('access-token')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMatchStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.matchesService.updateStatus(id, dto.status, user);
  }

  @Patch('matches/:id/result')
  @Auth('ORGANIZER', 'ADMIN')
  @ApiBearerAuth('access-token')
  setResult(
    @Param('id') id: string,
    @Body() dto: SetResultDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.matchesService.setResult(id, dto, user);
  }

  @Delete('matches/:id')
  @Auth('ORGANIZER', 'ADMIN')
  @ApiBearerAuth('access-token')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.matchesService.remove(id, user);
  }

  @Get('matches/:id/weather')
  async getWeather(@Param('id') id: string) {
    const match = await this.matchesService.findOne(id);
    const weather = await this.weatherService.getCurrentWeather();

    return {
      matchId: match.id,
      scheduledAt: match.scheduledAt,
      weatherAvailable: weather !== null,
      currentWeather: weather,
    };
  }
}
