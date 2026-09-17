import { Body, Controller, Post } from '@nestjs/common';
import { PalletsService } from './pallets.service';
import { MovePalletDto } from './dto/move-pallet.dto';

@Controller('pallets')
export class PalletsController {
  constructor(private readonly palletsService: PalletsService) {}

  @Post('move')
  move(@Body() dto: MovePalletDto) {
    return this.palletsService.move(dto);
  }
}
