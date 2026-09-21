import {
  BIN_CAPACITY,
  computeRiskBreakdown,
  computeRiskScore,
  type ActivityKind,
  type AuditResult,
  type RiskBreakdown,
} from '../scoring/risk-score';

type PalletRow = { id: string; skuLabel: string; movedAt: Date };
type ActivityRow = { type: ActivityKind; createdAt: Date };
type BinRow = {
  id: string;
  code: string;
  aisleIndex: number;
  rackIndex: number;
  binIndex: number;
  riskScore: number;
  factorDaysSinceChecked?: number;
  factorActivity?: number;
  factorAdjustment?: number;
  factorFailedAudit?: number;
  factorOccupancy?: number;
  lastAuditResult?: AuditResult | null;
  lastCheckedAt: Date;
  pallets: PalletRow[];
  activities?: ActivityRow[];
};
type RackRow = {
  id: string;
  code: string;
  aisleIndex: number;
  rackIndex: number;
  bins: BinRow[];
};
type AisleRow = {
  id: string;
  code: string;
  aisleIndex: number;
  racks: RackRow[];
};

export type WarehouseTree = {
  id: string;
  name: string;
  aisleCount: number;
  racksPerAisle: number;
  binsPerRack: number;
  createdAt: Date;
  aisles: AisleRow[];
};

export function mapRiskBreakdown(bin: BinRow): RiskBreakdown {
  const computed = computeRiskBreakdown({
    lastCheckedAt: bin.lastCheckedAt,
    palletCount: bin.pallets.length,
    activities: bin.activities,
    moveTimestamps: bin.activities
      ? undefined
      : bin.pallets.map((p) => p.movedAt),
    lastAuditResult: bin.lastAuditResult ?? null,
  });

  if (
    bin.factorDaysSinceChecked != null &&
    bin.factorActivity != null &&
    bin.factorAdjustment != null &&
    bin.factorFailedAudit != null &&
    bin.factorOccupancy != null
  ) {
    return {
      ...computed,
      score: bin.riskScore,
      factors: {
        daysSinceChecked: bin.factorDaysSinceChecked,
        activity: bin.factorActivity,
        adjustment: bin.factorAdjustment,
        failedAudit: bin.factorFailedAudit,
        occupancy: bin.factorOccupancy,
      },
    };
  }

  return computed;
}

export function mapBinResponse(bin: BinRow) {
  const breakdown = mapRiskBreakdown(bin);
  return {
    id: bin.id,
    code: bin.code,
    aisleIndex: bin.aisleIndex,
    rackIndex: bin.rackIndex,
    binIndex: bin.binIndex,
    riskScore: bin.riskScore,
    lastCheckedAt: bin.lastCheckedAt.toISOString(),
    lastAuditResult: bin.lastAuditResult ?? null,
    pallets: bin.pallets.map((p) => ({
      id: p.id,
      skuLabel: p.skuLabel,
      movedAt: p.movedAt.toISOString(),
    })),
    riskBreakdown: {
      score: breakdown.score,
      factors: breakdown.factors,
      weights: breakdown.weights,
      inputs: breakdown.inputs,
    },
  };
}

export function mapWarehouseResponse(warehouse: WarehouseTree) {
  return {
    id: warehouse.id,
    name: warehouse.name,
    aisleCount: warehouse.aisleCount,
    racksPerAisle: warehouse.racksPerAisle,
    binsPerRack: warehouse.binsPerRack,
    createdAt: warehouse.createdAt.toISOString(),
    aisles: warehouse.aisles.map((aisle) => ({
      id: aisle.id,
      code: aisle.code,
      aisleIndex: aisle.aisleIndex,
      racks: aisle.racks.map((rack) => ({
        id: rack.id,
        code: rack.code,
        aisleIndex: rack.aisleIndex,
        rackIndex: rack.rackIndex,
        bins: rack.bins.map((bin) => mapBinResponse(bin)),
      })),
    })),
  };
}

export function scoreFieldsForBin(bin: {
  lastCheckedAt: Date;
  pallets: { movedAt: Date }[];
  activities?: ActivityRow[];
  lastAuditResult?: AuditResult | null;
}) {
  const breakdown = computeRiskBreakdown({
    lastCheckedAt: bin.lastCheckedAt,
    palletCount: bin.pallets.length,
    activities: bin.activities,
    moveTimestamps: bin.activities
      ? undefined
      : bin.pallets.map((p) => p.movedAt),
    lastAuditResult: bin.lastAuditResult ?? null,
  });
  return {
    riskScore: breakdown.score,
    factorDaysSinceChecked: breakdown.factors.daysSinceChecked,
    factorActivity: breakdown.factors.activity,
    factorAdjustment: breakdown.factors.adjustment,
    factorFailedAudit: breakdown.factors.failedAudit,
    factorOccupancy: breakdown.factors.occupancy,
  };
}

/** @deprecated use scoreFieldsForBin */
export function scoreForBin(bin: {
  lastCheckedAt: Date;
  pallets: { movedAt: Date }[];
  activities?: ActivityRow[];
  lastAuditResult?: AuditResult | null;
}): number {
  return computeRiskScore({
    lastCheckedAt: bin.lastCheckedAt,
    palletCount: bin.pallets.length,
    activities: bin.activities,
    moveTimestamps: bin.activities
      ? undefined
      : bin.pallets.map((p) => p.movedAt),
    lastAuditResult: bin.lastAuditResult ?? null,
  });
}

export function formatBinAddress(
  aisleIndex: number,
  rackIndex: number,
  binIndex: number,
): string {
  const a = String(aisleIndex + 1).padStart(2, '0');
  const r = String(rackIndex + 1).padStart(2, '0');
  const b = String(binIndex + 1).padStart(2, '0');
  return `A${a}-R${r}-B${b}`;
}

export { BIN_CAPACITY };
