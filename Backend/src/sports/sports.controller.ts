import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SportsService } from './sports.service';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { Auth } from '../common/decorators/auth.decorator';

@ApiTags('Sports')
@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Post()
  @Auth('ADMIN')
  @ApiBearerAuth('access-token')
  create(@Body() dto: CreateSportDto) {
    return this.sportsService.create(dto);
  }

  @Get()
  findAll() {
    return this.sportsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sportsService.findOne(id);
  }

  @Patch(':id')
  @Auth('ADMIN')
  @ApiBearerAuth('access-token')
  update(@Param('id') id: string, @Body() dto: UpdateSportDto) {
    return this.sportsService.update(id, dto);
  }

  @Delete(':id')
  @Auth('ADMIN')
  @ApiBearerAuth('access-token')
  remove(@Param('id') id: string) {
    return this.sportsService.remove(id);
  }
}
