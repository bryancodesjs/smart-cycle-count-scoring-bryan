/**
 * Risk score 0–100.
 *
 * 35% days since last audit (0–30 days)
 * 25% putaway + pick + move (last 30 days, full at 8)
 * 15% adjustments (last 30 days, full at 3)
 * 15% occupancy (pallets / capacity)
 * 10% last audit failed
 */

import {
  BIN_CAPACITY,
  type ActivityKind,
  type AuditPassFail,
  type InventoryActivity,
  type RiskBreakdown,
} from "./domain";

export const RISK_WEIGHTS = {
  daysSinceChecked: 0.35,
  activity: 0.25,
  adjustment: 0.15,
  occupancy: 0.15,
  failedAudit: 0.1,
} as const;

export const RISK_WINDOWS = {
  maxDaysUnchecked: 30,
  activityLookbackDays: 30,
  maxActivityForFullScore: 8,
  maxAdjustmentsForFullScore: 3,
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

export function computeRiskBreakdown(input: {
  lastCheckedAt: string;
  palletCount: number;
  activities?: InventoryActivity[];
  moveTimestamps?: string[];
  lastAuditResult?: AuditPassFail | null;
  now?: Date;
}): RiskBreakdown {
  const now = input.now ?? new Date();
  const days = daysSince(input.lastCheckedAt, now);
  const daysSinceChecked = linearScale(days, RISK_WINDOWS.maxDaysUnchecked);

  const lookbackMs = RISK_WINDOWS.activityLookbackDays * 24 * 60 * 60 * 1000;
  const inWindow = (iso: string) =>
    now.getTime() - new Date(iso).getTime() <= lookbackMs;

  const events: InventoryActivity[] =
    input.activities ??
    (input.moveTimestamps ?? []).map((createdAt) => ({
      type: "MOVE" as ActivityKind,
      createdAt,
    }));

  const recent = events.filter((event) => inWindow(event.createdAt));
  const activityCount = recent.filter((event) => event.type !== "ADJUST").length;
  const adjustmentCount = recent.filter((event) => event.type === "ADJUST").length;

  const activity = linearScale(
    activityCount,
    RISK_WINDOWS.maxActivityForFullScore,
  );
  const adjustment = linearScale(
    adjustmentCount,
    RISK_WINDOWS.maxAdjustmentsForFullScore,
  );
  const occupancy = linearScale(input.palletCount, BIN_CAPACITY);
  const failedAudit = input.lastAuditResult === "FAIL" ? 100 : 0;

  const factors = {
    daysSinceChecked: Math.round(daysSinceChecked),
    activity: Math.round(activity),
    adjustment: Math.round(adjustment),
    occupancy: Math.round(occupancy),
    failedAudit,
  };

  const raw =
    RISK_WEIGHTS.daysSinceChecked * factors.daysSinceChecked +
    RISK_WEIGHTS.activity * factors.activity +
    RISK_WEIGHTS.adjustment * factors.adjustment +
    RISK_WEIGHTS.occupancy * factors.occupancy +
    RISK_WEIGHTS.failedAudit * factors.failedAudit;

  return {
    score: Math.round(clamp(raw, 0, 100)),
    factors,
    weights: { ...RISK_WEIGHTS },
    inputs: {
      daysSinceChecked: days,
      activityCount,
      adjustmentCount,
      palletCount: input.palletCount,
      lastAuditResult: input.lastAuditResult ?? null,
    },
  };
}

export function computeRiskScore(input: {
  lastCheckedAt: string;
  palletCount: number;
  activities?: InventoryActivity[];
  moveTimestamps?: string[];
  lastAuditResult?: AuditPassFail | null;
  now?: Date;
}): number {
  return computeRiskBreakdown(input).score;
}

export function breakdownForBin(bin: {
  lastCheckedAt: string;
  pallets: { movedAt: string }[];
  activities?: InventoryActivity[];
  lastAuditResult?: AuditPassFail | null;
  riskScore?: number;
  riskBreakdown?: RiskBreakdown;
}): RiskBreakdown {
  if (bin.riskBreakdown) return bin.riskBreakdown;
  const computed = computeRiskBreakdown({
    lastCheckedAt: bin.lastCheckedAt,
    palletCount: bin.pallets.length,
    activities: bin.activities,
    moveTimestamps: bin.activities
      ? undefined
      : bin.pallets.map((p) => p.movedAt),
    lastAuditResult: bin.lastAuditResult ?? null,
  });
  if (bin.riskScore != null) {
    return { ...computed, score: bin.riskScore };
  }
  return computed;
}

/** Interpolate green → amber → red for risk 0–100 */
export function riskScoreToColor(score: number): string {
  const s = clamp(score, 0, 100);
  if (s <= 50) {
    const t = s / 50;
    const h = 142 - t * (142 - 45);
    const l = 42 + t * 8;
    return `oklch(${l}% 0.16 ${h})`;
  }
  const t = (s - 50) / 50;
  const h = 45 - t * 45;
  const l = 50 - t * 8;
  return `oklch(${l}% 0.18 ${h})`;
}

export function riskLabel(score: number): string {
  if (score < 25) return "Low";
  if (score < 50) return "Moderate";
  if (score < 75) return "Elevated";
  return "Critical";
}
