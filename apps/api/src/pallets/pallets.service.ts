import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovePalletDto } from './dto/move-pallet.dto';
import { BIN_CAPACITY, scoreForBin } from '../warehouses/warehouse.mapper';

@Injectable()
export class PalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async move(dto: MovePalletDto) {
    const pallet = await this.prisma.pallet.findUnique({
      where: { id: dto.palletId },
    });
    if (!pallet) throw new NotFoundException('Pallet not found');

    const target = await this.prisma.bin.findUnique({
      where: { id: dto.targetBinId },
      include: { pallets: true },
    });
    if (!target) throw new NotFoundException('Target bin not found');

    if (pallet.binId === target.id) {
      throw new BadRequestException('Pallet is already in the target bin');
    }

    if (target.pallets.length >= BIN_CAPACITY) {
      throw new BadRequestException('Target bin is at capacity (4/4)');
    }

    const now = new Date();
    const sourceBinId = pallet.binId;

    await this.prisma.$transaction(async (tx) => {
      await tx.pallet.update({
        where: { id: pallet.id },
        data: { binId: target.id, movedAt: now },
      });

      for (const binId of [sourceBinId, target.id]) {
        const bin = await tx.bin.findUnique({
          where: { id: binId },
          include: { pallets: true },
        });
        if (!bin) continue;
        await tx.bin.update({
          where: { id: binId },
          data: {
            riskScore: scoreForBin(bin),
          },
        });
      }
    });

    return { ok: true, palletId: pallet.id, targetBinId: target.id };
  }
}
