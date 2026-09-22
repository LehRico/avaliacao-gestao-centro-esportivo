import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateMatchDto {
  @IsUUID()
  courtId: string;

  @IsUUID()
  teamAId: string;

  @IsUUID()
  teamBId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  durationMin?: number;
}
