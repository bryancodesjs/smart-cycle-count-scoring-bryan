/** Domain types for warehouse cycle-count scoring */

export const BIN_CAPACITY = 4 as const;

export type RiskScore = number; // 0 (low) – 100 (high)

export interface RiskFactorScores {
  daysSinceChecked: number;
  recentMovement: number;
  occupancy: number;
}

export interface RiskBreakdown {
  score: number;
  factors: RiskFactorScores;
  weights: {
    daysSinceChecked: number;
    recentMovement: number;
    occupancy: number;
  };
  inputs: {
    daysSinceChecked: number;
    recentMoveCount: number;
    palletCount: number;
  };
}

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
  riskBreakdown?: RiskBreakdown;
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

export type TaskStatus = "PENDING" | "DONE";
export type AuditPassFail = "PASS" | "FAIL";

export interface AuditTask {
  id: string;
  binId: string;
  status: TaskStatus;
  riskScoreAtCreate: number;
  sortOrder: number;
  expectedQuantity: number;
  countedQuantity: number | null;
  result: AuditPassFail | null;
  completedAt: string | null;
  bin: {
    id: string;
    code: string;
    riskScore: number;
    lastCheckedAt: string;
    pallets: Pallet[];
  };
}

export interface AuditPlan {
  id: string;
  warehouseId: string;
  topN: number;
  createdAt: string;
  tasks: AuditTask[];
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
