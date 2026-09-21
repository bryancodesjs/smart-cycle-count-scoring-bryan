"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useWarehouse } from "@/components/warehouse-provider";
import { listBins } from "@/lib/warehouse";
import { BIN_CAPACITY } from "@/lib/domain";
import { RiskBadge } from "@/components/risk-legend";
import { RiskBreakdownPanel } from "@/components/risk-breakdown-panel";
import { daysSince, breakdownForBin } from "@/lib/risk";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function BinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { warehouse, loading } = useWarehouse();

  const bin = useMemo(() => {
    if (!warehouse) return null;
    return listBins(warehouse).find((b) => b.id === id) ?? null;
  }, [warehouse, id]);

  if (loading) {
    return (
      <div className="text-muted-foreground p-8 font-mono text-sm">Loading…</div>
    );
  }

  if (!bin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Bin not found</h1>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.25em] uppercase">
            Bin detail
          </p>
          <h1 className="mt-1 font-mono text-2xl font-semibold">{bin.code}</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Dashboard</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <RiskBadge score={bin.riskScore} />
        <span className="text-muted-foreground font-mono text-xs">
          {bin.pallets.length}/{BIN_CAPACITY} pallets ·{" "}
          {daysSince(bin.lastCheckedAt).toFixed(1)} days since check
        </span>
      </div>

      <Separator />

      <RiskBreakdownPanel breakdown={breakdownForBin(bin)} />

      <Separator />

      <section>
        <h2 className="mb-2 font-mono text-xs tracking-wider uppercase">
          Pallets
        </h2>
        {bin.pallets.length === 0 ? (
          <p className="text-muted-foreground text-sm">This bin is empty.</p>
        ) : (
          <ul className="divide-border border-border/60 divide-y rounded-xl border">
            {bin.pallets.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{p.skuLabel}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {new Date(p.movedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
