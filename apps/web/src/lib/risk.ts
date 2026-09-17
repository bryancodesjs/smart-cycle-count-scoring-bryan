/**
 * v1 risk score formula (0–100).
 *
 * riskScore = round(clamp(0, 100,
 *   0.45 * daysSinceCheckedScore +
 *   0.35 * recentMovementScore +
 *   0.20 * occupancyScore
 * ))
 *
 * - daysSinceChecked: linear 0→100 over 0–30 days
 * - recentMovement:   linear 0→100 over 0–10 moves in last 7 days
 * - occupancy:        (palletCount / 4) * 100
 */

import { BIN_CAPACITY } from "./domain";

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

export function daysSince(isoDate: string, now = new Date()): number {
  const then = new Date(isoDate).getTime();
  const diffMs = now.getTime() - then;
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

export function computeRiskScore(input: {
  lastCheckedAt: string;
  moveTimestamps: string[];
  palletCount: number;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const days = daysSince(input.lastCheckedAt, now);
  const checkedScore = linearScale(days, RISK_WINDOWS.maxDaysUnchecked);

  const lookbackMs =
    RISK_WINDOWS.movementLookbackDays * 24 * 60 * 60 * 1000;
  const recentMoves = input.moveTimestamps.filter(
    (t) => now.getTime() - new Date(t).getTime() <= lookbackMs,
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

/** Interpolate green → amber → red for risk 0–100 */
export function riskScoreToColor(score: number): string {
  const s = clamp(score, 0, 100);
  if (s <= 50) {
    // green (142) → amber (45)
    const t = s / 50;
    const h = 142 - t * (142 - 45);
    const l = 42 + t * 8;
    return `oklch(${l}% 0.16 ${h})`;
  }
  const t = (s - 50) / 50;
  const h = 45 - t * 45; // amber → red (~0)
  const l = 50 - t * 8;
  return `oklch(${l}% 0.18 ${h})`;
}

export function riskLabel(score: number): string {
  if (score < 25) return "Low";
  if (score < 50) return "Moderate";
  if (score < 75) return "Elevated";
  return "Critical";
}
