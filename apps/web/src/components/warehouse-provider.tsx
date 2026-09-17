"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Warehouse, WarehouseSetupInput } from "@/lib/domain";
import {
  createDemoWarehouse,
  createEmptyWarehouse,
  movePalletLocal,
} from "@/lib/warehouse";

const STORAGE_KEY = "sccs-warehouse-v1";

type WarehouseContextValue = {
  warehouse: Warehouse | null;
  loading: boolean;
  source: "api" | "local";
  error: string | null;
  refresh: () => Promise<void>;
  setupWarehouse: (input: WarehouseSetupInput) => Promise<void>;
  movePallet: (palletId: string, targetBinId: string) => Promise<void>;
  loadDemo: () => void;
};

const WarehouseContext = createContext<WarehouseContextValue | null>(null);

async function fetchApiWarehouse(): Promise<Warehouse | null> {
  try {
    const res = await fetch("/api/warehouses/current", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Warehouse;
  } catch {
    return null;
  }
}

function readLocal(): Warehouse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Warehouse;
  } catch {
    return null;
  }
}

function writeLocal(warehouse: Warehouse | null) {
  if (typeof window === "undefined") return;
  if (!warehouse) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(warehouse));
}

export function WarehouseProvider({ children }: { children: ReactNode }) {
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"api" | "local">("local");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const fromApi = await fetchApiWarehouse();
    if (fromApi) {
      setWarehouse(fromApi);
      setSource("api");
      writeLocal(fromApi);
      setLoading(false);
      return;
    }
    const local = readLocal() ?? createDemoWarehouse();
    setWarehouse(local);
    setSource("local");
    writeLocal(local);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setupWarehouse = useCallback(
    async (input: WarehouseSetupInput) => {
      setError(null);
      try {
        const res = await fetch("/api/warehouses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const created = (await res.json()) as Warehouse;
          setWarehouse(created);
          setSource("api");
          writeLocal(created);
          return;
        }
      } catch {
        // fall through to local
      }
      const local = createEmptyWarehouse(input);
      setWarehouse(local);
      setSource("local");
      writeLocal(local);
    },
    [],
  );

  const movePallet = useCallback(
    async (palletId: string, targetBinId: string) => {
      setError(null);
      if (source === "api") {
        try {
          const res = await fetch("/api/pallets/move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ palletId, targetBinId }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as {
              message?: string;
            } | null;
            throw new Error(body?.message ?? "Move failed");
          }
          await refresh();
          return;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Move failed");
          throw e;
        }
      }
      if (!warehouse) return;
      try {
        const next = movePalletLocal(warehouse, palletId, targetBinId);
        setWarehouse(next);
        writeLocal(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Move failed");
        throw e;
      }
    },
    [refresh, source, warehouse],
  );

  const loadDemo = useCallback(() => {
    const demo = createDemoWarehouse();
    setWarehouse(demo);
    setSource("local");
    writeLocal(demo);
  }, []);

  const value = useMemo(
    () => ({
      warehouse,
      loading,
      source,
      error,
      refresh,
      setupWarehouse,
      movePallet,
      loadDemo,
    }),
    [
      warehouse,
      loading,
      source,
      error,
      refresh,
      setupWarehouse,
      movePallet,
      loadDemo,
    ],
  );

  return (
    <WarehouseContext.Provider value={value}>
      {children}
    </WarehouseContext.Provider>
  );
}

export function useWarehouse() {
  const ctx = useContext(WarehouseContext);
  if (!ctx) {
    throw new Error("useWarehouse must be used within WarehouseProvider");
  }
  return ctx;
}
