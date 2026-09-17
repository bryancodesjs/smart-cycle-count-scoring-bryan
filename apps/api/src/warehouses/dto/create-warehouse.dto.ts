import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  aisleCount!: number;

  @IsInt()
  @Min(1)
  @Max(20)
  racksPerAisle!: number;

  @IsInt()
  @Min(1)
  @Max(20)
  binsPerRack!: number;
}
