import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuditsService } from './audits.service';
import { CompleteAuditDto, CreateAuditPlanDto } from './dto/audit.dto';

@Controller('audit-plans')
export class AuditPlansController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get('current')
  getCurrent() {
    return this.auditsService.getCurrentPlan();
  }

  @Post()
  create(@Body() dto: CreateAuditPlanDto) {
    return this.auditsService.createPlan(dto);
  }
}

@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get('bins/:code')
  findBin(@Param('code') code: string) {
    return this.auditsService.findBinByCode(code);
  }

  @Post('count')
  count(@Body() dto: CompleteAuditDto) {
    return this.auditsService.completeCount(dto);
  }
}
