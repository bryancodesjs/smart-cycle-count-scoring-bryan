/** Domain types for warehouse cycle-count scoring */

export const BIN_CAPACITY = 4 as const;

export type RiskScore = number; // 0 (low) – 100 (high)

export interface Pallet {
  id: string;
  skuLabel: string;
  movedAt: string; // ISO
}

export interface Bin {
  id: string;
  code: string; // e.g. A02-R03-B01
  aisleIndex: number;
  rackIndex: number;
  binIndex: number;
  riskScore: RiskScore;
  lastCheckedAt: string; // ISO
  pallets: Pallet[];
}

export interface Rack {
  id: string;
  code: string;
  aisleIndex: number;
  rackIndex: number;
  bins: Bin[];
}

export interface Aisle {
  id: string;
  code: string;
  aisleIndex: number;
  racks: Rack[];
}

export interface Warehouse {
  id: string;
  name: string;
  aisleCount: number;
  racksPerAisle: number;
  binsPerRack: number;
  aisles: Aisle[];
  createdAt: string;
}

export interface WarehouseSetupInput {
  name: string;
  aisleCount: number;
  racksPerAisle: number;
  binsPerRack: number;
}

export function binOccupancy(bin: Bin): number {
  return bin.pallets.length;
}

export function binHasCapacity(bin: Bin): boolean {
  return bin.pallets.length < BIN_CAPACITY;
}

export function formatBinAddress(
  aisleIndex: number,
  rackIndex: number,
  binIndex: number,
): string {
  const a = String(aisleIndex + 1).padStart(2, "0");
  const r = String(rackIndex + 1).padStart(2, "0");
  const b = String(binIndex + 1).padStart(2, "0");
  return `A${a}-R${r}-B${b}`;
}
