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
    <div className="border-border/50 from-muted/30 to-background rounded-xl border bg-linear-to-b p-2.5 sm:p-3">
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {warehouse.aisles.map((aisle) => (
          <section
            key={aisle.id}
            className="flex min-w-0 items-stretch gap-2 sm:gap-3"
            aria-label={`Aisle ${aisle.code}`}
          >
            <div className="flex w-9 shrink-0 flex-col justify-center sm:w-11">
              <h2 className="font-mono text-[10px] font-semibold tracking-wide sm:text-xs">
                {aisle.code}
              </h2>
              <span className="text-muted-foreground font-mono text-[8px] sm:text-[9px]">
                {aisle.racks.length}R
              </span>
            </div>

            <div
              className="grid min-w-0 flex-1 gap-1 sm:gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${aisle.racks.length}, minmax(0, 1fr))`,
              }}
            >
              {aisle.racks.map((rack) => (
                <div
                  key={rack.id}
                  className="flex min-w-0 flex-col gap-0.5"
                >
                  <div className="text-muted-foreground truncate text-center font-mono text-[8px] tracking-wider uppercase sm:text-[9px]">
                    {rack.code.split("-").pop()}
                  </div>
                  <div className="flex flex-col-reverse gap-0.5">
                    {rack.bins.map((bin) => {
                      const selected = bin.id === selectedBinId;
                      return (
                        <Tooltip key={bin.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onSelectBin(bin)}
                              className={cn(
                                "relative h-4 w-full overflow-hidden rounded-sm border transition sm:h-5",
                                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                                selected
                                  ? "border-foreground ring-foreground/30 ring-1"
                                  : "border-black/10 hover:brightness-110",
                              )}
                              style={{
                                backgroundColor: riskScoreToColor(bin.riskScore),
                              }}
                              aria-label={`Bin ${bin.code}, risk ${bin.riskScore}`}
                            >
                              <span className="sr-only">
                                {bin.pallets.length}/{BIN_CAPACITY} pallets
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
                  <div className="bg-muted/80 mt-0.5 flex h-0.5 overflow-hidden rounded-full">
                    {rack.bins.map((bin) => (
                      <div
                        key={bin.id}
                        className="h-full flex-1"
                        style={{
                          backgroundColor: riskScoreToColor(bin.riskScore),
                          opacity:
                            0.35 + (bin.pallets.length / BIN_CAPACITY) * 0.65,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
