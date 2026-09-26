import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateCourtDto } from './create-court.dto';

export class UpdateCourtDto extends PartialType(CreateCourtDto) {
  @IsOptional()
  @IsIn(['ATIVA', 'EM_MANUTENCAO', 'INATIVA'])
  status?: 'ATIVA' | 'EM_MANUTENCAO' | 'INATIVA';
}
