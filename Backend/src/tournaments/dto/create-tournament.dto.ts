import { IsDateString, IsString, IsUUID, MinLength } from 'class-validator';
import { ParseFlexibleDate } from '../../common/validators/parse-flexible-date.transform';
import { IsNotPastDate } from '../../common/validators/is-not-past-date.validator';
import { IsNotOnlyDigits } from '../../common/validators/is-not-only-digits.validator';

export class CreateTournamentDto {
  @IsString()
  @MinLength(2)
  @IsNotOnlyDigits()
  name: string;

  @IsUUID()
  sportId: string;

  @ParseFlexibleDate()
  @IsDateString()
  @IsNotPastDate()
  startDate: string;

  @ParseFlexibleDate()
  @IsDateString()
  endDate: string;
}
