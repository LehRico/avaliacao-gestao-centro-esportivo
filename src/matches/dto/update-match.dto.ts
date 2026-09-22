import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class UpdateMatchDto {
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
