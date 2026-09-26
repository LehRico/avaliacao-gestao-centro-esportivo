import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';
import { ParseFlexibleDate } from '../../common/validators/parse-flexible-date.transform';
import { IsNotPastDate } from '../../common/validators/is-not-past-date.validator';
import { IsNotOnlyDigits } from '../../common/validators/is-not-only-digits.validator';

export class UpdateTournamentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @IsNotOnlyDigits()
  name?: string;

  @IsOptional()
  @ParseFlexibleDate()
  @IsDateString()
  @IsNotPastDate()
  startDate?: string;

  @IsOptional()
  @ParseFlexibleDate()
  @IsDateString()
  endDate?: string;
}
