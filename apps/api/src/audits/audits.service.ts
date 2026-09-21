import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteAuditDto, CreateAuditPlanDto } from './dto/audit.dto';
import { scoreFieldsForBin } from '../warehouses/warehouse.mapper';

@Injectable()
export class AuditsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(dto: CreateAuditPlanDto) {
    const warehouse = await this.prisma.warehouse.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!warehouse) {
      throw new NotFoundException('No warehouse found. Create one first.');
    }

    const bins = await this.prisma.bin.findMany({
      orderBy: [{ riskScore: 'desc' }, { code: 'asc' }],
      take: dto.topN,
      include: { pallets: true },
    });

    if (bins.length === 0) {
      throw new BadRequestException('No bins available to plan');
    }

    const plan = await this.prisma.auditPlan.create({
      data: {
        warehouseId: warehouse.id,
        topN: dto.topN,
        tasks: {
          create: bins.map((bin, index) => ({
            binId: bin.id,
            riskScoreAtCreate: bin.riskScore,
            sortOrder: index + 1,
            expectedQuantity: bin.pallets.length,
            status: 'PENDING',
          })),
        },
      },
      include: {
        tasks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            bin: {
              include: { pallets: { orderBy: { skuLabel: 'asc' } } },
            },
          },
        },
      },
    });

    return this.mapPlan(plan);
  }

  async getCurrentPlan() {
    const plan = await this.prisma.auditPlan.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            bin: {
              include: { pallets: { orderBy: { skuLabel: 'asc' } } },
            },
          },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException('No audit plan found. Create one first.');
    }
    return this.mapPlan(plan);
  }

  async findBinByCode(code: string) {
    const normalized = code.trim().toUpperCase();
    const bin = await this.prisma.bin.findFirst({
      where: { code: { equals: normalized, mode: 'insensitive' } },
      include: { pallets: { orderBy: { skuLabel: 'asc' } } },
    });
    if (!bin) throw new NotFoundException(`Bin ${normalized} not found`);
    return {
      id: bin.id,
      code: bin.code,
      riskScore: bin.riskScore,
      lastCheckedAt: bin.lastCheckedAt.toISOString(),
      expectedQuantity: bin.pallets.length,
      pallets: bin.pallets.map((p) => ({
        id: p.id,
        skuLabel: p.skuLabel,
        movedAt: p.movedAt.toISOString(),
      })),
    };
  }

  async completeCount(dto: CompleteAuditDto) {
    let binId = dto.binId;
    let taskId = dto.taskId;

    if (!binId && dto.binCode) {
      const found = await this.prisma.bin.findFirst({
        where: {
          code: { equals: dto.binCode.trim().toUpperCase(), mode: 'insensitive' },
        },
      });
      if (!found) throw new NotFoundException('Bin not found');
      binId = found.id;
    }

    if (!binId && taskId) {
      const task = await this.prisma.auditTask.findUnique({
        where: { id: taskId },
      });
      if (!task) throw new NotFoundException('Audit task not found');
      binId = task.binId;
    }

    if (!binId) {
      throw new BadRequestException('binId, binCode, or taskId is required');
    }

    const bin = await this.prisma.bin.findUnique({
      where: { id: binId },
      include: { pallets: true },
    });
    if (!bin) throw new NotFoundException('Bin not found');

    const now = new Date();
    const expectedQuantity = bin.pallets.length;

    await this.prisma.$transaction(async (tx) => {
      await tx.bin.update({
        where: { id: bin.id },
        data: {
          lastCheckedAt: now,
          ...scoreFieldsForBin({
            lastCheckedAt: now,
            pallets: bin.pallets,
          }),
        },
      });

      if (!taskId) {
        const pending = await tx.auditTask.findFirst({
          where: { binId: bin.id, status: 'PENDING' },
          orderBy: { sortOrder: 'asc' },
        });
        taskId = pending?.id;
      }

      if (taskId) {
        await tx.auditTask.update({
          where: { id: taskId },
          data: {
            status: 'DONE',
            expectedQuantity,
            countedQuantity: dto.countedQuantity,
            result: dto.result,
            completedAt: now,
          },
        });
      }
    });

    return {
      ok: true,
      binId: bin.id,
      binCode: bin.code,
      expectedQuantity,
      countedQuantity: dto.countedQuantity,
      result: dto.result,
      taskId: taskId ?? null,
    };
  }

  private mapPlan(
    plan: {
      id: string;
      warehouseId: string;
      topN: number;
      createdAt: Date;
      tasks: Array<{
        id: string;
        binId: string;
        status: 'PENDING' | 'DONE';
        riskScoreAtCreate: number;
        sortOrder: number;
        expectedQuantity: number | null;
        countedQuantity: number | null;
        result: 'PASS' | 'FAIL' | null;
        completedAt: Date | null;
        bin: {
          id: string;
          code: string;
          riskScore: number;
          lastCheckedAt: Date;
          pallets: Array<{
            id: string;
            skuLabel: string;
            movedAt: Date;
          }>;
        };
      }>;
    },
  ) {
    return {
      id: plan.id,
      warehouseId: plan.warehouseId,
      topN: plan.topN,
      createdAt: plan.createdAt.toISOString(),
      tasks: plan.tasks.map((task) => ({
        id: task.id,
        binId: task.binId,
        status: task.status,
        riskScoreAtCreate: task.riskScoreAtCreate,
        sortOrder: task.sortOrder,
        expectedQuantity:
          task.expectedQuantity ?? task.bin.pallets.length,
        countedQuantity: task.countedQuantity,
        result: task.result,
        completedAt: task.completedAt?.toISOString() ?? null,
        bin: {
          id: task.bin.id,
          code: task.bin.code,
          riskScore: task.bin.riskScore,
          lastCheckedAt: task.bin.lastCheckedAt.toISOString(),
          pallets: task.bin.pallets.map((p) => ({
            id: p.id,
            skuLabel: p.skuLabel,
            movedAt: p.movedAt.toISOString(),
          })),
        },
      })),
    };
  }
}
