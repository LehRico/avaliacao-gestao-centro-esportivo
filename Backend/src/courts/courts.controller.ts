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
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { Auth } from '../common/decorators/auth.decorator';

@ApiTags('Courts')
@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Post()
  @Auth('ADMIN')
  @ApiBearerAuth('access-token')
  create(@Body() dto: CreateCourtDto) {
    return this.courtsService.create(dto);
  }

  @Get()
  findAll() {
    return this.courtsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courtsService.findOne(id);
  }

  @Patch(':id')
  @Auth('ADMIN')
  @ApiBearerAuth('access-token')
  update(@Param('id') id: string, @Body() dto: UpdateCourtDto) {
    return this.courtsService.update(id, dto);
  }

  @Delete(':id')
  @Auth('ADMIN')
  @ApiBearerAuth('access-token')
  remove(@Param('id') id: string) {
    return this.courtsService.remove(id);
  }
}
