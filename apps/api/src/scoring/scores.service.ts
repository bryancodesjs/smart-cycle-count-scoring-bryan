import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { scoreFieldsForBin } from '../warehouses/warehouse.mapper';

@Injectable()
export class ScoresService {
  constructor(private readonly prisma: PrismaService) {}

  async recomputeAll() {
    const warehouse = await this.prisma.warehouse.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!warehouse) {
      throw new NotFoundException('No warehouse found. Create one first.');
    }

    const bins = await this.prisma.bin.findMany({
      include: {
        pallets: true,
        activities: true,
      },
    });

    let updated = 0;
    for (const bin of bins) {
      const fields = scoreFieldsForBin(bin);
      await this.prisma.bin.update({
        where: { id: bin.id },
        data: fields,
      });
      updated += 1;
    }

    return { ok: true, updated };
  }
}
