import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { PalletsModule } from './pallets/pallets.module';
import { ScoresModule } from './scoring/scores.module';
import { AuditsModule } from './audits/audits.module';

@Module({
  imports: [
    PrismaModule,
    WarehousesModule,
    PalletsModule,
    ScoresModule,
    AuditsModule,
  ],
})
export class AppModule {}
