import { IsString, MinLength } from 'class-validator';

export class MovePalletDto {
  @IsString()
  @MinLength(1)
  palletId!: string;

  @IsString()
  @MinLength(1)
  targetBinId!: string;
}
