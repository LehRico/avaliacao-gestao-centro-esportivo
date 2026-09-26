import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ParseFlexibleDate } from '../../common/validators/parse-flexible-date.transform';
import { IsNotPastDate } from '../../common/validators/is-not-past-date.validator';

export class UpdateMatchDto {
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @IsOptional()
  @ParseFlexibleDate()
  @IsDateString()
  @IsNotPastDate()
  scheduledAt?: string;
}
