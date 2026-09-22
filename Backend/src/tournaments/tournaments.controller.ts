import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';
import { regulationMulterOptions } from './multer.config';
import { TournamentsService } from './tournaments.service';
import { HolidaysService } from '../external/holidays.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { RegisterTeamDto } from './dto/register-team.dto';
import { QueryTournamentDto } from './dto/query-tournament.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Tournaments')
@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly holidaysService: HolidaysService,
  ) {}

  @Post()
  @Auth('ORGANIZER', 'ADMIN')
  @ApiBearerAuth('access-token')
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTournamentDto,
  ) {
    return this.tournamentsService.create(user.userId, dto);
  }

  @Get()
  findAll(@Query() query: QueryTournamentDto) {
    return this.tournamentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Patch(':id')
  @Auth('ORGANIZER', 'ADMIN')
  @ApiBearerAuth('access-token')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tournamentsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Auth('ORGANIZER', 'ADMIN')
  @ApiBearerAuth('access-token')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tournamentsService.updateStatus(id, dto, user);
  }

  @Delete(':id')
  @Auth('ORGANIZER', 'ADMIN')
  @ApiBearerAuth('access-token')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.tournamentsService.remove(id, user);
  }

  @Post(':id/regulation')
  @Auth('ORGANIZER', 'ADMIN')
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Regulamento em PDF' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', regulationMulterOptions))
  uploadRegulation(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    return this.tournamentsService.setRegulation(id, file.path, user);
  }

  @Post(':id/teams')
  @Auth()
  @ApiBearerAuth('access-token')
  registerTeam(
    @Param('id') id: string,
    @Body() dto: RegisterTeamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tournamentsService.registerTeam(id, dto, user);
  }

  @Delete(':id/teams/:teamId')
  @Auth()
  @ApiBearerAuth('access-token')
  unregisterTeam(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tournamentsService.unregisterTeam(id, teamId, user);
  }

  @Get(':id/holiday-check')
  async checkHoliday(@Param('id') id: string) {
    const tournament = await this.tournamentsService.findOne(id);
    const holiday = await this.holidaysService.isHoliday(
      tournament.startDate,
    );

    return {
      tournamentId: tournament.id,
      startDate: tournament.startDate,
      isHoliday: holiday !== null,
      holiday,
    };
  }
}
