"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWarehouse } from "@/components/warehouse-provider";
import { RiskBadge } from "@/components/risk-legend";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuditPlanView() {
  const {
    auditPlan,
    loading,
    createAuditPlan,
    refreshAuditPlan,
    source,
  } = useWarehouse();
  const [topN, setTopN] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshAuditPlan();
  }, [refreshAuditPlan]);

  const summary = useMemo(() => {
    if (!auditPlan) return null;
    const pending = auditPlan.tasks.filter((t) => t.status === "PENDING").length;
    const done = auditPlan.tasks.filter((t) => t.status === "DONE").length;
    return { pending, done, total: auditPlan.tasks.length };
  }, [auditPlan]);

  async function onCreate() {
    setBusy(true);
    setError(null);
    try {
      await createAuditPlan(topN);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create plan");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center font-mono text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.25em] uppercase">
            Cycle count
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            Audit plan
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Top-N risky bins become tasks. Complete them in the mobile count
            flow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            {source === "api" ? "LIVE" : "LOCAL"}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/count">Open count flow</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/">Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="border-border/60 bg-muted/20 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plan-top-n" className="font-mono text-xs">
            Top N
          </Label>
          <Input
            id="plan-top-n"
            type="number"
            min={1}
            max={50}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value) || 1)}
            className="w-24"
          />
        </div>
        <Button disabled={busy} onClick={() => void onCreate()}>
          {busy ? "Creating…" : "Create plan → Top N"}
        </Button>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>

      {!auditPlan ? (
        <p className="text-muted-foreground text-sm">
          No audit plan yet. Generate one from the top risky bins.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span>
              Created {new Date(auditPlan.createdAt).toLocaleString()}
            </span>
            <span>·</span>
            <span>{summary?.pending ?? 0} pending</span>
            <span>·</span>
            <span>{summary?.done ?? 0} done</span>
            <span>·</span>
            <span>Top {auditPlan.topN}</span>
          </div>

          <div className="border-border/60 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/40 font-mono text-[10px] tracking-wider uppercase">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Bin</th>
                  <th className="px-3 py-2">Risk</th>
                  <th className="px-3 py-2">Expected</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {auditPlan.tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-border/50 border-t"
                  >
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">
                      {task.sortOrder}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium">
                      {task.bin.code}
                    </td>
                    <td className="px-3 py-2">
                      <RiskBadge score={task.riskScoreAtCreate} />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs tabular-nums">
                      {task.expectedQuantity}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          task.status === "DONE" ? "secondary" : "outline"
                        }
                        className="font-mono text-[10px]"
                      >
                        {task.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {task.result
                        ? `${task.result} (${task.countedQuantity ?? "—"} counted)`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {task.status === "PENDING" ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/count?taskId=${task.id}&bin=${task.bin.code}`}>
                            Count
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {task.completedAt
                            ? new Date(task.completedAt).toLocaleString()
                            : "Done"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
