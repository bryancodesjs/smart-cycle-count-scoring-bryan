"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Bin, Warehouse } from "@/lib/domain";
import { BIN_CAPACITY, binHasCapacity } from "@/lib/domain";
import { daysSince } from "@/lib/risk";
import { listBins } from "@/lib/warehouse";
import { useWarehouse } from "@/components/warehouse-provider";
import { RiskBadge } from "@/components/risk-legend";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

type Props = {
  warehouse: Warehouse;
  bin: Bin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BinDetailSheet({ warehouse, bin, open, onOpenChange }: Props) {
  const { movePallet, error } = useWarehouse();
  const [selectedPalletId, setSelectedPalletId] = useState<string | undefined>();
  const [targetBinId, setTargetBinId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const availableTargets = useMemo(() => {
    if (!bin) return [];
    return listBins(warehouse).filter(
      (b) => b.id !== bin.id && binHasCapacity(b),
    );
  }, [warehouse, bin]);

  async function handleMove() {
    if (!selectedPalletId || !targetBinId) return;
    setBusy(true);
    setLocalError(null);
    try {
      await movePallet(selectedPalletId, targetBinId);
      setSelectedPalletId(undefined);
      setTargetBinId(undefined);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Move failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {bin ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono">{bin.code}</SheetTitle>
              <SheetDescription>
                Bin detail · prioritize audits by risk score
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge score={bin.riskScore} />
                <span className="text-muted-foreground font-mono text-xs">
                  {bin.pallets.length}/{BIN_CAPACITY} occupied
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <dt className="text-muted-foreground">Last checked</dt>
                  <dd className="mt-0.5 font-medium">
                    {new Date(bin.lastCheckedAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Days stale</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {daysSince(bin.lastCheckedAt).toFixed(1)}
                  </dd>
                </div>
              </dl>

              <Separator />

              <div>
                <h3 className="mb-2 font-mono text-xs tracking-wider uppercase">
                  Pallets
                </h3>
                {bin.pallets.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Empty bin</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {bin.pallets.map((p) => (
                      <li
                        key={p.id}
                        className="border-border/60 flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-medium">{p.skuLabel}</div>
                          <div className="text-muted-foreground font-mono text-[10px]">
                            Moved {new Date(p.movedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {bin.pallets.length > 0 ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <h3 className="font-mono text-xs tracking-wider uppercase">
                      Move pallet
                    </h3>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="pallet-select" className="font-mono text-xs">
                        Pallet
                      </Label>
                      <Select
                        value={selectedPalletId}
                        onValueChange={setSelectedPalletId}
                      >
                        <SelectTrigger id="pallet-select" className="w-full">
                          <SelectValue placeholder="Select pallet" />
                        </SelectTrigger>
                        <SelectContent>
                          {bin.pallets.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.skuLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="target-select" className="font-mono text-xs">
                        Target bin (has capacity)
                      </Label>
                      <Select value={targetBinId} onValueChange={setTargetBinId}>
                        <SelectTrigger id="target-select" className="w-full">
                          <SelectValue placeholder="Select target" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTargets.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.code} ({b.pallets.length}/{BIN_CAPACITY})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(localError || error) && (
                      <p className="text-destructive text-sm">
                        {localError || error}
                      </p>
                    )}
                    <Button
                      onClick={() => void handleMove()}
                      disabled={
                        busy || !selectedPalletId || !targetBinId
                      }
                    >
                      {busy ? "Moving…" : "Move pallet"}
                    </Button>
                  </div>
                </>
              ) : null}

              <Button asChild variant="outline" size="sm">
                <Link href={`/bins/${bin.id}`}>Open full detail</Link>
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
