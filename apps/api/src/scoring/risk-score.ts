/**
 * Risk score 0–100.
 *
 * 35% days since last audit (0–30 days)
 * 25% putaway + pick + move events (last 30 days, full score at 8)
 * 15% adjustment frequency (last 30 days, full score at 3)
 * 15% occupancy (pallets / capacity)
 * 10% last audit failed (100 until a later pass)
 */

export const BIN_CAPACITY = 4;

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

export type ActivityKind = "PUTAWAY" | "PICK" | "ADJUST" | "MOVE";
export type AuditResult = "PASS" | "FAIL";

export type RiskFactorScores = {
  daysSinceChecked: number;
  activity: number;
  adjustment: number;
  occupancy: number;
  failedAudit: number;
};

export type RiskBreakdown = {
  score: number;
  factors: RiskFactorScores;
  weights: typeof RISK_WEIGHTS;
  inputs: {
    daysSinceChecked: number;
    activityCount: number;
    adjustmentCount: number;
    palletCount: number;
    lastAuditResult: AuditResult | null;
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
  palletCount: number;
  activities?: { type: ActivityKind; createdAt: Date }[];
  /** Used as MOVE events when `activities` is omitted (local pallet moves). */
  moveTimestamps?: Date[];
  lastAuditResult?: AuditResult | null;
  now?: Date;
}): RiskBreakdown {
  const now = input.now ?? new Date();
  const days = daysSince(input.lastCheckedAt, now);
  const daysSinceChecked = linearScale(days, RISK_WINDOWS.maxDaysUnchecked);

  const lookbackMs = RISK_WINDOWS.activityLookbackDays * 24 * 60 * 60 * 1000;
  const inWindow = (date: Date) => now.getTime() - date.getTime() <= lookbackMs;

  const events =
    input.activities ??
    (input.moveTimestamps ?? []).map((createdAt) => ({
      type: "MOVE" as const,
      createdAt,
    }));

  const recent = events.filter((event) => inWindow(event.createdAt));
  const activityCount = recent.filter((event) => event.type !== "ADJUST").length;
  const adjustmentCount = recent.filter((event) => event.type === "ADJUST").length;

  const activity = linearScale(activityCount, RISK_WINDOWS.maxActivityForFullScore);
  const adjustment = linearScale(
    adjustmentCount,
    RISK_WINDOWS.maxAdjustmentsForFullScore,
  );
  const occupancy = linearScale(input.palletCount, BIN_CAPACITY);
  const failedAudit = input.lastAuditResult === "FAIL" ? 100 : 0;

  const factors: RiskFactorScores = {
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
    weights: RISK_WEIGHTS,
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
  lastCheckedAt: Date;
  palletCount: number;
  activities?: { type: ActivityKind; createdAt: Date }[];
  moveTimestamps?: Date[];
  lastAuditResult?: AuditResult | null;
  now?: Date;
}): number {
  return computeRiskBreakdown(input).score;
}
