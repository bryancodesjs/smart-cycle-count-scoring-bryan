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

export type RiskFactorScores = {
  daysSinceChecked: number;
  recentMovement: number;
  occupancy: number;
};

export type RiskBreakdown = {
  score: number;
  factors: RiskFactorScores;
  weights: typeof RISK_WEIGHTS;
  inputs: {
    daysSinceChecked: number;
    recentMoveCount: number;
    palletCount: number;
  };
};

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

export function computeRiskBreakdown(input: {
  lastCheckedAt: Date;
  moveTimestamps: Date[];
  palletCount: number;
  now?: Date;
}): RiskBreakdown {
  const now = input.now ?? new Date();
  const days = daysSince(input.lastCheckedAt, now);
  const daysSinceChecked = linearScale(days, RISK_WINDOWS.maxDaysUnchecked);

  const lookbackMs =
    RISK_WINDOWS.movementLookbackDays * 24 * 60 * 60 * 1000;
  const recentMoveCount = input.moveTimestamps.filter(
    (t) => now.getTime() - t.getTime() <= lookbackMs,
  ).length;
  const recentMovement = linearScale(
    recentMoveCount,
    RISK_WINDOWS.maxMovesForFullScore,
  );

  const occupancy = linearScale(input.palletCount, BIN_CAPACITY);

  const factors: RiskFactorScores = {
    daysSinceChecked: Math.round(daysSinceChecked),
    recentMovement: Math.round(recentMovement),
    occupancy: Math.round(occupancy),
  };

  const raw =
    RISK_WEIGHTS.daysSinceChecked * factors.daysSinceChecked +
    RISK_WEIGHTS.recentMovement * factors.recentMovement +
    RISK_WEIGHTS.occupancy * factors.occupancy;

  return {
    score: Math.round(clamp(raw, 0, 100)),
    factors,
    weights: RISK_WEIGHTS,
    inputs: {
      daysSinceChecked: days,
      recentMoveCount,
      palletCount: input.palletCount,
    },
  };
}

export function computeRiskScore(input: {
  lastCheckedAt: Date;
  moveTimestamps: Date[];
  palletCount: number;
  now?: Date;
}): number {
  return computeRiskBreakdown(input).score;
}
