"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Bin } from "@/lib/domain";
import { listBins } from "@/lib/warehouse";
import { useWarehouse } from "@/components/warehouse-provider";
import { WarehouseGrid } from "@/components/warehouse-grid";
import { BinDetailSheet } from "@/components/bin-detail-sheet";
import { RiskLegend } from "@/components/risk-legend";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DashboardView() {
  const {
    warehouse,
    loading,
    source,
    loadDemo,
    refresh,
    recomputeScores,
    createAuditPlan,
  } = useWarehouse();
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [topN, setTopN] = useState(5);
  const [busy, setBusy] = useState<"recompute" | "plan" | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedBin: Bin | null = useMemo(() => {
    if (!warehouse || !selectedBinId) return null;
    return listBins(warehouse).find((b) => b.id === selectedBinId) ?? null;
  }, [warehouse, selectedBinId]);

  const stats = useMemo(() => {
    if (!warehouse) return null;
    const bins = listBins(warehouse);
    const avg =
      bins.reduce((sum, b) => sum + b.riskScore, 0) / Math.max(bins.length, 1);
    const critical = bins.filter((b) => b.riskScore >= 75).length;
    const occupied = bins.filter((b) => b.pallets.length > 0).length;
    return {
      binCount: bins.length,
      avg: Math.round(avg),
      critical,
      occupied,
    };
  }, [warehouse]);

  function onSelectBin(bin: Bin) {
    setSelectedBinId(bin.id);
    setSheetOpen(true);
  }

  async function onRecompute() {
    setBusy("recompute");
    setActionError(null);
    setActionMessage(null);
    try {
      await recomputeScores();
      setActionMessage("Scores recomputed. Heatmap updated.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Recompute failed");
    } finally {
      setBusy(null);
    }
  }

  async function onCreatePlan() {
    setBusy("plan");
    setActionError(null);
    setActionMessage(null);
    try {
      const plan = await createAuditPlan(topN);
      setActionMessage(
        `Audit plan created with ${plan.tasks.length} tasks. Open Audit Plan to review.`,
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not create plan");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center font-mono text-sm">
        Loading warehouse…
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">No warehouse yet</h1>
        <p className="text-muted-foreground text-sm">
          Create a warehouse layout or load the demo grid to start prioritizing
          cycle counts.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/setup">Set up warehouse</Link>
          </Button>
          <Button variant="outline" onClick={loadDemo}>
            Load demo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.25em] uppercase">
            Operations dashboard
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">
            {warehouse.name}
          </h1>
          <p className="text-muted-foreground mt-0.5 max-w-xl text-sm">
            Audit bins by risk first. Green is stable; red needs attention.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            {source === "api" ? "API" : "LOCAL"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => void onRecompute()}
          >
            {busy === "recompute" ? "Recomputing…" : "Recompute scores"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Refresh
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/setup">Edit setup</Link>
          </Button>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {[
            { label: "Bins", value: stats.binCount },
            { label: "Avg risk", value: stats.avg },
            { label: "Critical ≥75", value: stats.critical },
            { label: "Occupied", value: stats.occupied },
          ].map((s) => (
            <div
              key={s.label}
              className="border-border/60 bg-muted/30 rounded-lg border px-3 py-2"
            >
              <div className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                {s.label}
              </div>
              <div className="mt-0.5 font-mono text-xl font-semibold tabular-nums sm:text-2xl">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="border-border/60 bg-muted/20 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="top-n" className="font-mono text-xs">
            Create audit plan — Top N risky bins
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="top-n"
              type="number"
              min={1}
              max={50}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value) || 1)}
              className="w-20"
            />
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => void onCreatePlan()}
            >
              {busy === "plan" ? "Creating…" : "Generate audit plan"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/audit">View plan</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/count">Count flow</Link>
            </Button>
          </div>
        </div>
        {(actionMessage || actionError) && (
          <p
            role={actionError ? "alert" : "status"}
            className={
              actionError
                ? "text-destructive text-sm"
                : "text-sm font-medium"
            }
          >
            {actionError || actionMessage}
          </p>
        )}
      </div>

      <div className="border-border/50 flex flex-wrap items-center justify-between gap-3 border-y py-2">
        <RiskLegend />
        <p className="text-muted-foreground font-mono text-[10px]">
          {warehouse.aisleCount}A × {warehouse.racksPerAisle}R ×{" "}
          {warehouse.binsPerRack}B
        </p>
      </div>

      <WarehouseGrid
        warehouse={warehouse}
        selectedBinId={selectedBinId}
        onSelectBin={onSelectBin}
      />

      <BinDetailSheet
        warehouse={warehouse}
        bin={selectedBin}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
