import 'dotenv/config';
import { PrismaClient, type ActivityType } from '@prisma/client';
import { computeRiskBreakdown } from '../src/scoring/risk-score';

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function formatBinAddress(ai: number, ri: number, bi: number): string {
  return `A${String(ai + 1).padStart(2, '0')}-R${String(ri + 1).padStart(2, '0')}-B${String(bi + 1).padStart(2, '0')}`;
}

async function main() {
  await prisma.auditTask.deleteMany();
  await prisma.auditPlan.deleteMany();
  await prisma.inventoryActivity.deleteMany();
  await prisma.pallet.deleteMany();
  await prisma.bin.deleteMany();
  await prisma.rack.deleteMany();
  await prisma.aisle.deleteMany();
  await prisma.warehouse.deleteMany();

  // ≈30 bins: 3 aisles × 2 racks × 5 bins
  const aisleCount = 3;
  const racksPerAisle = 2;
  const binsPerRack = 5;

  const warehouse = await prisma.warehouse.create({
    data: {
      name: 'Demo Distribution Center',
      aisleCount,
      racksPerAisle,
      binsPerRack,
      aisles: {
        create: Array.from({ length: aisleCount }, (_, ai) => {
          const aisleCode = `A${String(ai + 1).padStart(2, '0')}`;
          return {
            code: aisleCode,
            aisleIndex: ai,
            racks: {
              create: Array.from({ length: racksPerAisle }, (_, ri) => ({
                code: `${aisleCode}-R${String(ri + 1).padStart(2, '0')}`,
                aisleIndex: ai,
                rackIndex: ri,
                bins: {
                  create: Array.from({ length: binsPerRack }, (_, bi) => ({
                    code: formatBinAddress(ai, ri, bi),
                    aisleIndex: ai,
                    rackIndex: ri,
                    binIndex: bi,
                    lastCheckedAt: new Date(),
                    riskScore: 0,
                  })),
                },
              })),
            },
          };
        }),
      },
    },
    include: {
      aisles: {
        include: {
          racks: { include: { bins: true } },
        },
      },
    },
  });

  const binByAddr = new Map<string, string>();
  for (const aisle of warehouse.aisles) {
    for (const rack of aisle.racks) {
      for (const bin of rack.bins) {
        binByAddr.set(bin.code, bin.id);
      }
    }
  }

  const scenarios: Array<{
    code: string;
    checkedDaysAgo: number;
    pallets: Array<{ sku: string; movedDaysAgo: number }>;
    activities: Array<{
      type: ActivityType;
      daysAgo: number;
      note: string;
    }>;
  }> = [
    {
      code: 'A01-R01-B01',
      checkedDaysAgo: 28,
      pallets: [
        { sku: 'SKU-A01-01', movedDaysAgo: 1 },
        { sku: 'SKU-A01-02', movedDaysAgo: 2 },
        { sku: 'SKU-A01-03', movedDaysAgo: 1 },
        { sku: 'SKU-A01-04', movedDaysAgo: 0 },
      ],
      activities: [
        { type: 'PUTAWAY', daysAgo: 25, note: 'Inbound putaway' },
        { type: 'MOVE', daysAgo: 14, note: 'Slot consolidation' },
        { type: 'PICK', daysAgo: 3, note: 'Outbound pick' },
        { type: 'ADJUST', daysAgo: 2, note: 'Cycle variance adjust' },
      ],
    },
    {
      code: 'A01-R01-B02',
      checkedDaysAgo: 12,
      pallets: [
        { sku: 'SKU-A01-05', movedDaysAgo: 3 },
        { sku: 'SKU-A01-06', movedDaysAgo: 5 },
      ],
      activities: [
        { type: 'PUTAWAY', daysAgo: 20, note: 'Putaway' },
        { type: 'PICK', daysAgo: 6, note: 'Pick' },
      ],
    },
    {
      code: 'A01-R02-B03',
      checkedDaysAgo: 5,
      pallets: [
        { sku: 'SKU-A01-07', movedDaysAgo: 1 },
        { sku: 'SKU-A01-08', movedDaysAgo: 1 },
        { sku: 'SKU-A01-09', movedDaysAgo: 2 },
      ],
      activities: [
        { type: 'PUTAWAY', daysAgo: 10, note: 'Putaway' },
        { type: 'MOVE', daysAgo: 4, note: 'Re-slot' },
      ],
    },
    {
      code: 'A02-R01-B04',
      checkedDaysAgo: 20,
      pallets: [
        { sku: 'SKU-A02-01', movedDaysAgo: 0 },
        { sku: 'SKU-A02-02', movedDaysAgo: 1 },
        { sku: 'SKU-A02-03', movedDaysAgo: 2 },
        { sku: 'SKU-A02-04', movedDaysAgo: 3 },
      ],
      activities: [
        { type: 'PUTAWAY', daysAgo: 22, note: 'Bulk putaway' },
        { type: 'ADJUST', daysAgo: 8, note: 'Damage adjust' },
        { type: 'PICK', daysAgo: 1, note: 'Pick wave' },
      ],
    },
    {
      code: 'A02-R02-B05',
      checkedDaysAgo: 25,
      pallets: [
        { sku: 'SKU-A02-05', movedDaysAgo: 1 },
        { sku: 'SKU-A02-06', movedDaysAgo: 0 },
        { sku: 'SKU-A02-07', movedDaysAgo: 2 },
      ],
      activities: [
        { type: 'MOVE', daysAgo: 18, note: 'Moved from A01' },
        { type: 'PICK', daysAgo: 2, note: 'Pick' },
      ],
    },
    {
      code: 'A03-R01-B03',
      checkedDaysAgo: 18,
      pallets: [
        { sku: 'SKU-A03-01', movedDaysAgo: 1 },
        { sku: 'SKU-A03-02', movedDaysAgo: 1 },
        { sku: 'SKU-A03-03', movedDaysAgo: 1 },
        { sku: 'SKU-A03-04', movedDaysAgo: 1 },
      ],
      activities: [
        { type: 'PUTAWAY', daysAgo: 19, note: 'Putaway' },
        { type: 'ADJUST', daysAgo: 7, note: 'Qty adjust' },
        { type: 'MOVE', daysAgo: 1, note: 'Internal move' },
      ],
    },
    {
      code: 'A03-R02-B02',
      checkedDaysAgo: 30,
      pallets: [
        { sku: 'SKU-A03-05', movedDaysAgo: 0 },
        { sku: 'SKU-A03-06', movedDaysAgo: 0 },
        { sku: 'SKU-A03-07', movedDaysAgo: 1 },
      ],
      activities: [
        { type: 'PUTAWAY', daysAgo: 29, note: 'Stale putaway' },
        { type: 'PICK', daysAgo: 15, note: 'Old pick' },
        { type: 'ADJUST', daysAgo: 4, note: 'Shrink adjust' },
        { type: 'MOVE', daysAgo: 0, note: 'Recent move' },
      ],
    },
  ];

  for (const s of scenarios) {
    const binId = binByAddr.get(s.code);
    if (!binId) continue;

    await prisma.bin.update({
      where: { id: binId },
      data: { lastCheckedAt: daysAgo(s.checkedDaysAgo) },
    });

    for (const p of s.pallets) {
      await prisma.pallet.create({
        data: {
          binId,
          skuLabel: p.sku,
          movedAt: daysAgo(p.movedDaysAgo),
        },
      });
    }

    for (const a of s.activities) {
      let palletId: string | undefined;
      if (a.type === 'PICK') {
        const picked = await prisma.pallet.create({
          data: {
            binId,
            skuLabel: `PICKED-${s.code}-${a.daysAgo}`,
            movedAt: daysAgo(a.daysAgo),
          },
        });
        palletId = picked.id;
        await prisma.inventoryActivity.create({
          data: {
            binId,
            type: a.type,
            palletId,
            note: a.note,
            createdAt: daysAgo(a.daysAgo),
          },
        });
        await prisma.pallet.delete({ where: { id: picked.id } });
        continue;
      }

      await prisma.inventoryActivity.create({
        data: {
          binId,
          type: a.type,
          note: a.note,
          createdAt: daysAgo(a.daysAgo),
        },
      });
    }
  }

  const bins = await prisma.bin.findMany({
    include: { pallets: true, activities: true },
  });
  for (const bin of bins) {
    const breakdown = computeRiskBreakdown({
      lastCheckedAt: bin.lastCheckedAt,
      palletCount: bin.pallets.length,
      activities: bin.activities.map((a) => ({
        type: a.type,
        createdAt: a.createdAt,
      })),
      lastAuditResult: bin.lastAuditResult,
    });
    await prisma.bin.update({
      where: { id: bin.id },
      data: {
        riskScore: breakdown.score,
        factorDaysSinceChecked: breakdown.factors.daysSinceChecked,
        factorActivity: breakdown.factors.activity,
        factorAdjustment: breakdown.factors.adjustment,
        factorFailedAudit: breakdown.factors.failedAudit,
        factorOccupancy: breakdown.factors.occupancy,
      },
    });
  }

  const activityCount = await prisma.inventoryActivity.count();
  console.log(
    `Seeded warehouse "${warehouse.name}" with ${bins.length} bins, demo pallets, and ${activityCount} activity events.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
