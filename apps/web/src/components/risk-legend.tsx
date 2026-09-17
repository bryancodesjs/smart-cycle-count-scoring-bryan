"use client";

import { riskLabel, riskScoreToColor } from "@/lib/risk";
import { cn } from "@/lib/utils";

export function RiskLegend() {
  const stops = [0, 25, 50, 75, 100];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
        Risk
      </span>
      <div className="flex items-center gap-1">
        {stops.map((s) => (
          <div key={s} className="flex flex-col items-center gap-1">
            <span
              className="size-3 rounded-sm ring-1 ring-black/10"
              style={{ backgroundColor: riskScoreToColor(s) }}
              title={`${s}`}
            />
            <span className="text-muted-foreground font-mono text-[9px]">{s}</span>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground hidden gap-2 font-mono text-[10px] sm:flex">
        <span>0 Low</span>
        <span>·</span>
        <span>100 Critical</span>
      </div>
    </div>
  );
}

export function RiskBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-xs text-white",
        className,
      )}
      style={{ backgroundColor: riskScoreToColor(score) }}
    >
      <span className="font-semibold tabular-nums">{score}</span>
      <span className="opacity-90">{riskLabel(score)}</span>
    </span>
  );
}
