import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAuditPlanDto {
  @IsInt()
  @Min(1)
  @Max(50)
  topN!: number;
}

export class CompleteAuditDto {
  @IsInt()
  @Min(0)
  countedQuantity!: number;

  @IsIn(['PASS', 'FAIL'])
  result!: 'PASS' | 'FAIL';

  @IsOptional()
  @IsString()
  binCode?: string;

  @IsOptional()
  @IsString()
  binId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;
}
