import { BIN_CAPACITY, computeRiskScore } from '../scoring/risk-score';

type PalletRow = { id: string; skuLabel: string; movedAt: Date };
type BinRow = {
  id: string;
  code: string;
  aisleIndex: number;
  rackIndex: number;
  binIndex: number;
  riskScore: number;
  lastCheckedAt: Date;
  pallets: PalletRow[];
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
        bins: rack.bins.map((bin) => ({
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
        })),
      })),
    })),
  };
}

export function scoreForBin(bin: {
  lastCheckedAt: Date;
  pallets: { movedAt: Date }[];
}): number {
  return computeRiskScore({
    lastCheckedAt: bin.lastCheckedAt,
    moveTimestamps: bin.pallets.map((p) => p.movedAt),
    palletCount: bin.pallets.length,
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
