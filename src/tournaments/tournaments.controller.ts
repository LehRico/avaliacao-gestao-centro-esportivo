import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { regulationMulterOptions } from './multer.config';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { RegisterTeamDto } from './dto/register-team.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  @Auth('ORGANIZER', 'ADMIN')
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTournamentDto,
  ) {
    return this.tournamentsService.create(user.userId, dto);
  }

  @Get()
  findAll() {
    return this.tournamentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Patch(':id')
  @Auth('ORGANIZER', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tournamentsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Auth('ORGANIZER', 'ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTournamentStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tournamentsService.updateStatus(id, dto, user);
  }

  @Delete(':id')
  @Auth('ORGANIZER', 'ADMIN')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.tournamentsService.remove(id, user);
  }

  @Post(':id/regulation')
  @Auth('ORGANIZER', 'ADMIN')
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
  registerTeam(
    @Param('id') id: string,
    @Body() dto: RegisterTeamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tournamentsService.registerTeam(id, dto, user);
  }

  @Delete(':id/teams/:teamId')
  @Auth()
  unregisterTeam(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tournamentsService.unregisterTeam(id, teamId, user);
  }

}
