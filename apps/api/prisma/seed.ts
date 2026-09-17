import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { computeRiskScore } from '../src/scoring/risk-score';

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
  await prisma.pallet.deleteMany();
  await prisma.bin.deleteMany();
  await prisma.rack.deleteMany();
  await prisma.aisle.deleteMany();
  await prisma.warehouse.deleteMany();

  const aisleCount = 3;
  const racksPerAisle = 4;
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
    },
    {
      code: 'A01-R01-B02',
      checkedDaysAgo: 12,
      pallets: [
        { sku: 'SKU-A01-05', movedDaysAgo: 3 },
        { sku: 'SKU-A01-06', movedDaysAgo: 5 },
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
    },
    {
      code: 'A02-R04-B05',
      checkedDaysAgo: 25,
      pallets: [
        { sku: 'SKU-A02-05', movedDaysAgo: 1 },
        { sku: 'SKU-A02-06', movedDaysAgo: 0 },
        { sku: 'SKU-A02-07', movedDaysAgo: 2 },
      ],
    },
    {
      code: 'A03-R02-B03',
      checkedDaysAgo: 18,
      pallets: [
        { sku: 'SKU-A03-01', movedDaysAgo: 1 },
        { sku: 'SKU-A03-02', movedDaysAgo: 1 },
        { sku: 'SKU-A03-03', movedDaysAgo: 1 },
        { sku: 'SKU-A03-04', movedDaysAgo: 1 },
      ],
    },
    {
      code: 'A03-R04-B02',
      checkedDaysAgo: 30,
      pallets: [
        { sku: 'SKU-A03-05', movedDaysAgo: 0 },
        { sku: 'SKU-A03-06', movedDaysAgo: 0 },
        { sku: 'SKU-A03-07', movedDaysAgo: 1 },
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
  }

  const bins = await prisma.bin.findMany({ include: { pallets: true } });
  for (const bin of bins) {
    const riskScore = computeRiskScore({
      lastCheckedAt: bin.lastCheckedAt,
      moveTimestamps: bin.pallets.map((p) => p.movedAt),
      palletCount: bin.pallets.length,
    });
    await prisma.bin.update({
      where: { id: bin.id },
      data: { riskScore },
    });
  }

  console.log(
    `Seeded warehouse "${warehouse.name}" with ${bins.length} bins and demo pallets.`,
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
