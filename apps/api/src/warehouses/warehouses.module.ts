import { Module } from '@nestjs/common';
import {
  BinsController,
  WarehousesController,
} from './warehouses.controller';
import { WarehousesService } from './warehouses.service';

@Module({
  controllers: [WarehousesController, BinsController],
  providers: [WarehousesService],
  exports: [WarehousesService],
})
export class WarehousesModule {}
