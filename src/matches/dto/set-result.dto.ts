import { IsInt, Min } from 'class-validator';

export class SetResultDto {
  @IsInt()
  @Min(0)
  scoreA: number;

  @IsInt()
  @Min(0)
  scoreB: number;
}
