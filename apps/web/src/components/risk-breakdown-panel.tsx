"use client";

import type { RiskBreakdown } from "@/lib/domain";
import { RISK_WEIGHTS } from "@/lib/risk";

const FACTOR_META: Array<{
  key: keyof RiskBreakdown["factors"];
  label: string;
  hint: string;
  weight: number;
}> = [
  {
    key: "daysSinceChecked",
    label: "Days since checked",
    hint: "Staleness over 0–30 days",
    weight: RISK_WEIGHTS.daysSinceChecked,
  },
  {
    key: "recentMovement",
    label: "Recent movement",
    hint: "Moves in the last 7 days",
    weight: RISK_WEIGHTS.recentMovement,
  },
  {
    key: "occupancy",
    label: "Occupancy",
    hint: "Pallets vs bin capacity",
    weight: RISK_WEIGHTS.occupancy,
  },
];

export function RiskBreakdownPanel({
  breakdown,
}: {
  breakdown: RiskBreakdown;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-xs tracking-wider uppercase">
          Why this score
        </h3>
        <span className="text-muted-foreground font-mono text-[10px]">
          Weighted total {breakdown.score}
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {FACTOR_META.map((factor) => {
          const value = breakdown.factors[factor.key];
          const contribution = Math.round(value * factor.weight);
          return (
            <li key={factor.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{factor.label}</p>
                  <p className="text-muted-foreground font-mono text-[10px]">
                    {factor.hint} · weight {Math.round(factor.weight * 100)}%
                  </p>
                </div>
                <div className="text-right font-mono text-xs tabular-nums">
                  <div className="font-semibold">{value}</div>
                  <div className="text-muted-foreground text-[10px]">
                    → {contribution}
                  </div>
                </div>
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-foreground/70 h-full rounded-full transition-[width]"
                  style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground font-mono text-[10px]">
        Inputs: {breakdown.inputs.daysSinceChecked.toFixed(1)}d stale ·{" "}
        {breakdown.inputs.recentMoveCount} recent moves ·{" "}
        {breakdown.inputs.palletCount} pallets
      </p>
    </div>
  );
}
