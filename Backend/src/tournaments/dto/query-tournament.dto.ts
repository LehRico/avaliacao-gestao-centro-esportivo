import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { TournamentStatusInput } from './update-tournament-status.dto';

export class QueryTournamentDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  sportId?: string;

  @IsOptional()
  @IsEnum(TournamentStatusInput)
  status?: TournamentStatusInput;
}
