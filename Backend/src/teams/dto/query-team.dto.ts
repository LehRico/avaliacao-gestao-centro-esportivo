import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryTeamDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  sportId?: string;
}
