import { IsEnum } from 'class-validator';

export enum TournamentStatusInput {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELED = 'CANCELED',
}

export class UpdateTournamentStatusDto {
  @IsEnum(TournamentStatusInput)
  status: TournamentStatusInput;
}
