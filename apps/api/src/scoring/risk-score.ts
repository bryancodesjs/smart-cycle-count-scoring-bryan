/**
 * v1 risk score formula (0–100).
 *
 * Weights (industry-aligned: stale checks + movement dominate error likelihood;
 * occupancy approximates location density/complexity for this MVP):
 * - days since last checked: 45%
 * - recent movement (7d):    35%
 * - occupancy density:       20%
 */

export const BIN_CAPACITY = 4;

export const RISK_WEIGHTS = {
  daysSinceChecked: 0.45,
  recentMovement: 0.35,
  occupancy: 0.2,
} as const;

export const RISK_WINDOWS = {
  maxDaysUnchecked: 30,
  movementLookbackDays: 7,
  maxMovesForFullScore: 10,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function linearScale(value: number, max: number): number {
  if (max <= 0) return 0;
  return clamp((value / max) * 100, 0, 100);
}

export function daysSince(date: Date, now = new Date()): number {
  const diffMs = now.getTime() - date.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

export function computeRiskScore(input: {
  lastCheckedAt: Date;
  moveTimestamps: Date[];
  palletCount: number;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const checkedScore = linearScale(
    daysSince(input.lastCheckedAt, now),
    RISK_WINDOWS.maxDaysUnchecked,
  );

  const lookbackMs =
    RISK_WINDOWS.movementLookbackDays * 24 * 60 * 60 * 1000;
  const recentMoves = input.moveTimestamps.filter(
    (t) => now.getTime() - t.getTime() <= lookbackMs,
  ).length;
  const movementScore = linearScale(
    recentMoves,
    RISK_WINDOWS.maxMovesForFullScore,
  );

  const occupancyScore = linearScale(input.palletCount, BIN_CAPACITY);

  const raw =
    RISK_WEIGHTS.daysSinceChecked * checkedScore +
    RISK_WEIGHTS.recentMovement * movementScore +
    RISK_WEIGHTS.occupancy * occupancyScore;

  return Math.round(clamp(raw, 0, 100));
}
