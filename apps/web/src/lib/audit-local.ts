import type {
  AuditPassFail,
  AuditPlan,
  AuditTask,
  Warehouse,
} from "./domain";
import { listBins } from "./warehouse";
import { computeRiskBreakdown } from "./risk";

const PLAN_KEY = "sccs-audit-plan-v1";

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function readLocalPlan(): AuditPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuditPlan;
  } catch {
    return null;
  }
}

export function writeLocalPlan(plan: AuditPlan | null) {
  if (typeof window === "undefined") return;
  if (!plan) {
    localStorage.removeItem(PLAN_KEY);
    return;
  }
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export function createLocalAuditPlan(
  warehouse: Warehouse,
  topN: number,
): AuditPlan {
  const bins = [...listBins(warehouse)].sort(
    (a, b) => b.riskScore - a.riskScore || a.code.localeCompare(b.code),
  );
  const selected = bins.slice(0, Math.max(1, topN));
  const plan: AuditPlan = {
    id: id("plan"),
    warehouseId: warehouse.id,
    topN,
    createdAt: new Date().toISOString(),
    tasks: selected.map(
      (bin, index): AuditTask => ({
        id: id("task"),
        binId: bin.id,
        status: "PENDING",
        riskScoreAtCreate: bin.riskScore,
        sortOrder: index + 1,
        expectedQuantity: bin.pallets.length,
        countedQuantity: null,
        result: null,
        completedAt: null,
        bin: {
          id: bin.id,
          code: bin.code,
          riskScore: bin.riskScore,
          lastCheckedAt: bin.lastCheckedAt,
          pallets: bin.pallets,
        },
      }),
    ),
  };
  writeLocalPlan(plan);
  return plan;
}

export function completeLocalCount(
  warehouse: Warehouse,
  input: {
    binId?: string;
    binCode?: string;
    taskId?: string;
    countedQuantity: number;
    result: AuditPassFail;
  },
): { warehouse: Warehouse; plan: AuditPlan | null } {
  const next = structuredClone(warehouse);
  const bins = listBins(next);
  let plan = readLocalPlan();

  let bin =
    (input.binId ? bins.find((b) => b.id === input.binId) : undefined) ??
    (input.binCode
      ? bins.find(
          (b) => b.code.toUpperCase() === input.binCode!.trim().toUpperCase(),
        )
      : undefined);

  if (!bin && input.taskId && plan) {
    const task = plan.tasks.find((t) => t.id === input.taskId);
    if (task) bin = bins.find((b) => b.id === task.binId);
  }

  if (!bin) throw new Error("Bin not found");

  const now = new Date().toISOString();
  bin.lastCheckedAt = now;
  bin.lastAuditResult = input.result;
  const breakdown = computeRiskBreakdown({
    lastCheckedAt: bin.lastCheckedAt,
    palletCount: bin.pallets.length,
    activities: bin.activities,
    moveTimestamps: bin.activities
      ? undefined
      : bin.pallets.map((p) => p.movedAt),
    lastAuditResult: input.result,
  });
  bin.riskScore = breakdown.score;
  bin.riskBreakdown = breakdown;

  if (plan) {
    const matchId =
      input.taskId ??
      plan.tasks.find((t) => t.binId === bin!.id && t.status === "PENDING")?.id;

    plan = {
      ...plan,
      tasks: plan.tasks.map((task) => {
        const binSnapshot = {
          id: bin!.id,
          code: bin!.code,
          riskScore: bin!.riskScore,
          lastCheckedAt: bin!.lastCheckedAt,
          pallets: bin!.pallets,
        };

        if (matchId && task.id === matchId) {
          return {
            ...task,
            status: "DONE" as const,
            expectedQuantity: bin!.pallets.length,
            countedQuantity: input.countedQuantity,
            result: input.result,
            completedAt: now,
            bin: binSnapshot,
          };
        }

        if (task.binId === bin!.id) {
          return { ...task, bin: binSnapshot };
        }

        return task;
      }),
    };
    writeLocalPlan(plan);
  }

  return { warehouse: next, plan };
}

export function recomputeLocalWarehouse(warehouse: Warehouse): Warehouse {
  const next = structuredClone(warehouse);
  for (const bin of listBins(next)) {
    const breakdown = computeRiskBreakdown({
      lastCheckedAt: bin.lastCheckedAt,
      palletCount: bin.pallets.length,
      activities: bin.activities,
      moveTimestamps: bin.activities
        ? undefined
        : bin.pallets.map((p) => p.movedAt),
      lastAuditResult: bin.lastAuditResult ?? null,
    });
    bin.riskScore = breakdown.score;
    bin.riskBreakdown = breakdown;
  }
  return next;
}
