import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { PalletsModule } from './pallets/pallets.module';

@Module({
  imports: [PrismaModule, WarehousesModule, PalletsModule],
})
export class AppModule {}
