import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Auth()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(user.userId, dto);
  }

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @Auth()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamsService.update(id, dto, user);
  }

  @Delete(':id')
  @Auth()
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.teamsService.remove(id, user);
  }

  @Post(':id/members')
  @Auth()
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamsService.addMember(id, dto, user);
  }

  @Delete(':id/members/:userId')
  @Auth()
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamsService.removeMember(id, userId, user);
  }
}
