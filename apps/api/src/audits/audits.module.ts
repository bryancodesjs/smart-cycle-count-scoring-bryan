import { Module } from '@nestjs/common';
import { AuditsService } from './audits.service';
import { AuditPlansController, AuditsController } from './audits.controller';

@Module({
  controllers: [AuditPlansController, AuditsController],
  providers: [AuditsService],
  exports: [AuditsService],
})
export class AuditsModule {}
