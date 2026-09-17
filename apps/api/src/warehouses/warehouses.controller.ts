import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get('current')
  getCurrent() {
    return this.warehousesService.getCurrent();
  }

  @Post()
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(dto);
  }
}

@Controller('bins')
export class BinsController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get(':id')
  getBin(@Param('id') id: string) {
    return this.warehousesService.getBin(id);
  }
}
