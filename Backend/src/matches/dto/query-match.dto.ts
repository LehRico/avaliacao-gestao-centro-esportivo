import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MatchStatusInput } from './update-match-status.dto';

export class QueryMatchDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  tournamentId?: string;

  @IsOptional()
  @IsEnum(MatchStatusInput)
  status?: MatchStatusInput;
}
