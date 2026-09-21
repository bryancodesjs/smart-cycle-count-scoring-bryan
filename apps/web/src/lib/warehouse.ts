import {
  type Bin,
  type Pallet,
  type Warehouse,
  type WarehouseSetupInput,
  BIN_CAPACITY,
  formatBinAddress,
} from "./domain";
import { computeRiskBreakdown } from "./risk";

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function buildPallets(
  count: number,
  skuBase: string,
  moveDays: number[],
): Pallet[] {
  return Array.from({ length: count }, (_, i) => ({
    id: id("plt"),
    skuLabel: `${skuBase}-${String(i + 1).padStart(2, "0")}`,
    movedAt: daysAgo(moveDays[i % moveDays.length] ?? 3),
  }));
}

function scoreBin(bin: Omit<Bin, "riskScore" | "riskBreakdown">): Bin {
  const riskBreakdown = computeRiskBreakdown({
    lastCheckedAt: bin.lastCheckedAt,
    palletCount: bin.pallets.length,
    activities: bin.activities,
    moveTimestamps: bin.activities
      ? undefined
      : bin.pallets.map((p) => p.movedAt),
    lastAuditResult: bin.lastAuditResult ?? null,
  });
  return {
    ...bin,
    riskScore: riskBreakdown.score,
    riskBreakdown,
  };
}

/** Build a warehouse hierarchy from setup dimensions (empty bins). */
export function createEmptyWarehouse(input: WarehouseSetupInput): Warehouse {
  const now = new Date().toISOString();
  const aisles = Array.from({ length: input.aisleCount }, (_, ai) => {
    const aisleCode = `A${String(ai + 1).padStart(2, "0")}`;
    const racks = Array.from({ length: input.racksPerAisle }, (_, ri) => {
      const rackCode = `${aisleCode}-R${String(ri + 1).padStart(2, "0")}`;
      const bins = Array.from({ length: input.binsPerRack }, (_, bi) =>
        scoreBin({
          id: id("bin"),
          code: formatBinAddress(ai, ri, bi),
          aisleIndex: ai,
          rackIndex: ri,
          binIndex: bi,
          lastCheckedAt: now,
          pallets: [],
        }),
      );
      return {
        id: id("rack"),
        code: rackCode,
        aisleIndex: ai,
        rackIndex: ri,
        bins,
      };
    });
    return {
      id: id("aisle"),
      code: aisleCode,
      aisleIndex: ai,
      racks,
    };
  });

  return {
    id: id("wh"),
    name: input.name.trim() || "Warehouse",
    aisleCount: input.aisleCount,
    racksPerAisle: input.racksPerAisle,
    binsPerRack: input.binsPerRack,
    aisles,
    createdAt: now,
  };
}

/** Demo fixture: 3 aisles × 4 racks × 5 bins with mixed risk/occupancy */
export function createDemoWarehouse(): Warehouse {
  const base = createEmptyWarehouse({
    name: "Demo Distribution Center",
    aisleCount: 3,
    racksPerAisle: 4,
    binsPerRack: 5,
  });

  const scenarios: Array<{
    a: number;
    r: number;
    b: number;
    pallets: number;
    checkedDaysAgo: number;
    moveDays: number[];
  }> = [
    { a: 0, r: 0, b: 0, pallets: 4, checkedDaysAgo: 28, moveDays: [1, 2, 1, 0] },
    { a: 0, r: 0, b: 1, pallets: 2, checkedDaysAgo: 12, moveDays: [3, 5] },
    { a: 0, r: 1, b: 2, pallets: 3, checkedDaysAgo: 5, moveDays: [1, 1, 2] },
    { a: 0, r: 2, b: 0, pallets: 1, checkedDaysAgo: 1, moveDays: [10] },
    { a: 1, r: 0, b: 3, pallets: 4, checkedDaysAgo: 20, moveDays: [0, 1, 2, 3] },
    { a: 1, r: 1, b: 1, pallets: 2, checkedDaysAgo: 8, moveDays: [4, 6] },
    { a: 1, r: 3, b: 4, pallets: 3, checkedDaysAgo: 25, moveDays: [1, 0, 2] },
    { a: 2, r: 0, b: 0, pallets: 1, checkedDaysAgo: 2, moveDays: [14] },
    { a: 2, r: 1, b: 2, pallets: 4, checkedDaysAgo: 18, moveDays: [1, 1, 1, 1] },
    { a: 2, r: 2, b: 3, pallets: 2, checkedDaysAgo: 15, moveDays: [2, 7] },
    { a: 2, r: 3, b: 1, pallets: 3, checkedDaysAgo: 30, moveDays: [0, 0, 1] },
  ];

  for (const s of scenarios) {
    const aisle = base.aisles[s.a];
    const rack = aisle?.racks[s.r];
    const bin = rack?.bins[s.b];
    if (!bin) continue;
    const count = Math.min(s.pallets, BIN_CAPACITY);
    bin.lastCheckedAt = daysAgo(s.checkedDaysAgo);
    bin.pallets = buildPallets(count, `SKU-${bin.code}`, s.moveDays);
    const scored = scoreBin({
      id: bin.id,
      code: bin.code,
      aisleIndex: bin.aisleIndex,
      rackIndex: bin.rackIndex,
      binIndex: bin.binIndex,
      lastCheckedAt: bin.lastCheckedAt,
      pallets: bin.pallets,
    });
    bin.riskScore = scored.riskScore;
    bin.riskBreakdown = scored.riskBreakdown;
  }

  return base;
}

export function findBin(warehouse: Warehouse, binId: string): Bin | undefined {
  for (const aisle of warehouse.aisles) {
    for (const rack of aisle.racks) {
      const bin = rack.bins.find((b) => b.id === binId);
      if (bin) return bin;
    }
  }
  return undefined;
}

export function listBins(warehouse: Warehouse): Bin[] {
  return warehouse.aisles.flatMap((a) => a.racks.flatMap((r) => r.bins));
}

export function movePalletLocal(
  warehouse: Warehouse,
  palletId: string,
  targetBinId: string,
): Warehouse {
  const bins = listBins(warehouse);
  const source = bins.find((b) => b.pallets.some((p) => p.id === palletId));
  const target = bins.find((b) => b.id === targetBinId);

  if (!source || !target) {
    throw new Error("Source or target bin not found");
  }
  if (source.id === target.id) {
    throw new Error("Pallet is already in the target bin");
  }
  if (target.pallets.length >= BIN_CAPACITY) {
    throw new Error("Target bin is at capacity (4/4)");
  }

  const pallet = source.pallets.find((p) => p.id === palletId);
  if (!pallet) throw new Error("Pallet not found");

  const now = new Date().toISOString();
  const moved: Pallet = { ...pallet, movedAt: now };

  const next: Warehouse = structuredClone(warehouse);
  const nextBins = listBins(next);
  const nextSource = nextBins.find((b) => b.id === source.id)!;
  const nextTarget = nextBins.find((b) => b.id === target.id)!;

  nextSource.pallets = nextSource.pallets.filter((p) => p.id !== palletId);
  nextTarget.pallets = [...nextTarget.pallets, moved];

  for (const bin of [nextSource, nextTarget]) {
    const activity = {
      type: "MOVE" as const,
      createdAt: now,
    };
    bin.activities = [...(bin.activities ?? []), activity];
    const breakdown = computeRiskBreakdown({
      lastCheckedAt: bin.lastCheckedAt,
      palletCount: bin.pallets.length,
      activities: bin.activities,
      lastAuditResult: bin.lastAuditResult ?? null,
    });
    bin.riskScore = breakdown.score;
    bin.riskBreakdown = breakdown;
  }

  return next;
}
