import { IsEnum } from 'class-validator';

export enum MatchStatusInput {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELED = 'CANCELED',
}

export class UpdateMatchStatusDto {
  @IsEnum(MatchStatusInput)
  status: MatchStatusInput;
}
