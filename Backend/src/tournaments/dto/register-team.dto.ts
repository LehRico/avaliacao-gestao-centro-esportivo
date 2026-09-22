import { IsUUID } from 'class-validator';

export class RegisterTeamDto {
  @IsUUID()
  teamId: string;
}
