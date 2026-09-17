import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import {
  formatBinAddress,
  mapWarehouseResponse,
  scoreForBin,
} from './warehouse.mapper';

const warehouseInclude = {
  aisles: {
    orderBy: { aisleIndex: 'asc' as const },
    include: {
      racks: {
        orderBy: { rackIndex: 'asc' as const },
        include: {
          bins: {
            orderBy: { binIndex: 'asc' as const },
            include: {
              pallets: { orderBy: { skuLabel: 'asc' as const } },
            },
          },
        },
      },
    },
  },
};

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent() {
    const warehouse = await this.prisma.warehouse.findFirst({
      orderBy: { createdAt: 'desc' },
      include: warehouseInclude,
    });
    if (!warehouse) {
      throw new NotFoundException('No warehouse found. Create one first.');
    }
    return mapWarehouseResponse(warehouse);
  }

  async create(dto: CreateWarehouseDto) {
    await this.prisma.pallet.deleteMany();
    await this.prisma.bin.deleteMany();
    await this.prisma.rack.deleteMany();
    await this.prisma.aisle.deleteMany();
    await this.prisma.warehouse.deleteMany();

    const now = new Date();
    const warehouse = await this.prisma.warehouse.create({
      data: {
        name: dto.name.trim(),
        aisleCount: dto.aisleCount,
        racksPerAisle: dto.racksPerAisle,
        binsPerRack: dto.binsPerRack,
        aisles: {
          create: Array.from({ length: dto.aisleCount }, (_, ai) => {
            const aisleCode = `A${String(ai + 1).padStart(2, '0')}`;
            return {
              code: aisleCode,
              aisleIndex: ai,
              racks: {
                create: Array.from({ length: dto.racksPerAisle }, (_, ri) => {
                  const rackCode = `${aisleCode}-R${String(ri + 1).padStart(2, '0')}`;
                  return {
                    code: rackCode,
                    aisleIndex: ai,
                    rackIndex: ri,
                    bins: {
                      create: Array.from(
                        { length: dto.binsPerRack },
                        (_, bi) => ({
                          code: formatBinAddress(ai, ri, bi),
                          aisleIndex: ai,
                          rackIndex: ri,
                          binIndex: bi,
                          lastCheckedAt: now,
                          riskScore: scoreForBin({
                            lastCheckedAt: now,
                            pallets: [],
                          }),
                        }),
                      ),
                    },
                  };
                }),
              },
            };
          }),
        },
      },
      include: warehouseInclude,
    });

    return mapWarehouseResponse(warehouse);
  }

  async getBin(binId: string) {
    const bin = await this.prisma.bin.findUnique({
      where: { id: binId },
      include: { pallets: { orderBy: { skuLabel: 'asc' } } },
    });
    if (!bin) throw new NotFoundException('Bin not found');
    return {
      id: bin.id,
      code: bin.code,
      aisleIndex: bin.aisleIndex,
      rackIndex: bin.rackIndex,
      binIndex: bin.binIndex,
      riskScore: bin.riskScore,
      lastCheckedAt: bin.lastCheckedAt.toISOString(),
      pallets: bin.pallets.map((p) => ({
        id: p.id,
        skuLabel: p.skuLabel,
        movedAt: p.movedAt.toISOString(),
      })),
    };
  }
}
