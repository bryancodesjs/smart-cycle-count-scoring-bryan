"use client";

import type { Bin, Warehouse } from "@/lib/domain";
import { BIN_CAPACITY } from "@/lib/domain";
import { riskScoreToColor } from "@/lib/risk";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  warehouse: Warehouse;
  selectedBinId: string | null;
  onSelectBin: (bin: Bin) => void;
};

export function WarehouseGrid({ warehouse, selectedBinId, onSelectBin }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {warehouse.aisles.map((aisle) => (
        <section key={aisle.id} className="min-w-0">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="font-mono text-sm font-semibold tracking-wide">
              Aisle {aisle.code}
            </h2>
            <span className="text-muted-foreground font-mono text-[10px]">
              {aisle.racks.length} racks ·{" "}
              {aisle.racks.reduce((n, r) => n + r.bins.length, 0)} bins
            </span>
          </div>

          <div className="border-border/50 from-muted/40 to-background overflow-x-auto rounded-xl border bg-linear-to-b p-3 sm:p-4">
            <div className="flex min-w-max gap-3 sm:gap-4">
              {aisle.racks.map((rack) => (
                <div key={rack.id} className="flex w-[7.5rem] shrink-0 flex-col gap-2 sm:w-32">
                  <div className="text-muted-foreground truncate text-center font-mono text-[10px] tracking-wider uppercase">
                    {rack.code.split("-").pop()}
                  </div>
                  <div className="flex flex-col-reverse gap-1.5">
                    {rack.bins.map((bin) => {
                      const selected = bin.id === selectedBinId;
                      return (
                        <Tooltip key={bin.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onSelectBin(bin)}
                              className={cn(
                                "relative aspect-square w-full overflow-hidden rounded-md border transition",
                                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                                selected
                                  ? "border-foreground ring-foreground/30 ring-2"
                                  : "border-black/10 hover:brightness-110",
                              )}
                              style={{
                                backgroundColor: riskScoreToColor(bin.riskScore),
                              }}
                              aria-label={`Bin ${bin.code}, risk ${bin.riskScore}`}
                            >
                              <span className="absolute inset-x-0 bottom-0 bg-black/25 py-0.5 text-center font-mono text-[9px] text-white tabular-nums">
                                {bin.pallets.length}/{BIN_CAPACITY}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="font-mono text-xs">
                            <div className="font-semibold">{bin.code}</div>
                            <div>Risk {bin.riskScore}</div>
                            <div>
                              {bin.pallets.length}/{BIN_CAPACITY} pallets
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                  {/* occupancy strip under rack — visual cue without card clutter */}
                  <div className="bg-muted/80 mt-1 flex h-1 overflow-hidden rounded-full">
                    {rack.bins.map((bin) => (
                      <div
                        key={bin.id}
                        className="h-full flex-1 opacity-80"
                        style={{
                          backgroundColor: riskScoreToColor(bin.riskScore),
                          opacity: 0.35 + (bin.pallets.length / BIN_CAPACITY) * 0.65,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
