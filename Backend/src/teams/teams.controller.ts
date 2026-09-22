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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { QueryTeamDto } from './dto/query-team.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Auth()
  @ApiBearerAuth('access-token')
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(user.userId, dto);
  }

  @Get()
  findAll(@Query() query: QueryTeamDto) {
    return this.teamsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @Auth()
  @ApiBearerAuth('access-token')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamsService.update(id, dto, user);
  }

  @Delete(':id')
  @Auth()
  @ApiBearerAuth('access-token')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.teamsService.remove(id, user);
  }

  @Post(':id/members')
  @Auth()
  @ApiBearerAuth('access-token')
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamsService.addMember(id, dto, user);
  }

  @Delete(':id/members/:userId')
  @Auth()
  @ApiBearerAuth('access-token')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.teamsService.removeMember(id, userId, user);
  }
}
