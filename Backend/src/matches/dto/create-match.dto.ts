import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ParseFlexibleDate } from '../../common/validators/parse-flexible-date.transform';
import { IsNotPastDate } from '../../common/validators/is-not-past-date.validator';

export class CreateMatchDto {
  @IsOptional()
  @IsUUID()
  tournamentId?: string;

  @IsUUID()
  courtId: string;

  @IsUUID()
  teamAId: string;

  @IsUUID()
  teamBId: string;

  @ParseFlexibleDate()
  @IsDateString()
  @IsNotPastDate()
  scheduledAt: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  durationMin?: number;
}
