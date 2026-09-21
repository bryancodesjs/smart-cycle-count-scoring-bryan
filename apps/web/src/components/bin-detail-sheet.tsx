"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  CircleCheckIcon,
  SquareCheckIcon,
  SquareIcon,
} from "lucide-react";

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionsKey, setActionsKey] = useState(0);
  const successRef = useRef<HTMLDivElement>(null);

  function resetActionState() {
    setSelectedPalletId(undefined);
    setTargetBinId(undefined);
    setLocalError(null);
    setBusy(false);
    setActionsKey((k) => k + 1);
  }

  useEffect(() => {
    resetActionState();
    setSuccessMessage(null);
  }, [open, bin?.id]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const availableTargets = useMemo(() => {
    if (!bin) return [];
    return listBins(warehouse).filter(
      (b) => b.id !== bin.id && binHasCapacity(b),
    );
  }, [warehouse, bin]);

  function togglePallet(palletId: string) {
    setSuccessMessage(null);
    setLocalError(null);
    setSelectedPalletId((current) =>
      current === palletId ? undefined : palletId,
    );
  }

  function onTargetChange(value: string) {
    setSuccessMessage(null);
    setLocalError(null);
    setTargetBinId(value);
  }

  async function handleMove() {
    if (!bin || !selectedPalletId || !targetBinId) return;

    const pallet = bin.pallets.find((p) => p.id === selectedPalletId);
    const target = availableTargets.find((b) => b.id === targetBinId);
    if (!pallet || !target) return;

    setBusy(true);
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await movePallet(selectedPalletId, targetBinId);
      resetActionState();
      setSuccessMessage(`Moved ${pallet.skuLabel} to ${target.code}.`);
      requestAnimationFrame(() => {
        successRef.current?.focus();
      });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Move failed");
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

              {successMessage ? (
                <div
                  ref={successRef}
                  role="status"
                  aria-live="polite"
                  tabIndex={-1}
                  className="border-foreground/15 bg-muted/50 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 outline-none"
                >
                  <CircleCheckIcon
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <p className="text-sm font-medium">{successMessage}</p>
                </div>
              ) : null}

              <Separator />

              <div>
                <h3 className="mb-1 font-mono text-xs tracking-wider uppercase">
                  Pallets
                </h3>
                {bin.pallets.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Empty bin</p>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-2 text-sm">
                      Select a pallet to perform an action.
                    </p>
                    <ul className="flex flex-col gap-2">
                      {bin.pallets.map((p) => {
                        const selected = p.id === selectedPalletId;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => togglePallet(p.id)}
                              aria-pressed={selected}
                              className={cn(
                                "border-border/60 flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition",
                                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                                selected
                                  ? "border-foreground bg-muted/40 ring-foreground/20 ring-1"
                                  : "hover:bg-muted/30",
                              )}
                            >
                              {selected ? (
                                <SquareCheckIcon
                                  className="text-foreground mt-0.5 size-4 shrink-0"
                                  aria-hidden
                                />
                              ) : (
                                <SquareIcon
                                  className="text-muted-foreground mt-0.5 size-4 shrink-0"
                                  aria-hidden
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium">
                                  {p.skuLabel}
                                </div>
                                <div className="text-muted-foreground font-mono text-[10px]">
                                  Moved {new Date(p.movedAt).toLocaleDateString()}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>

              {bin.pallets.length > 0 ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <h3 className="font-mono text-xs tracking-wider uppercase">
                      Actions
                    </h3>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="target-select" className="font-mono text-xs">
                        Move to bin
                      </Label>
                      <Select
                        key={actionsKey}
                        value={targetBinId}
                        onValueChange={onTargetChange}
                      >
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
                      <p
                        role="alert"
                        className="text-destructive text-sm"
                      >
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
