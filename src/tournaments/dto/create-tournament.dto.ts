import { IsDateString, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsUUID()
  sportId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
