"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWarehouse } from "@/components/warehouse-provider";
import { PageBackLink } from "@/components/page-back-link";
import { listBins } from "@/lib/warehouse";
import type { AuditPassFail, Pallet } from "@/lib/domain";
import { RiskBadge } from "@/components/risk-legend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleCheckIcon, ScanBarcodeIcon } from "lucide-react";

type LookupBin = {
  id: string;
  code: string;
  riskScore: number;
  lastCheckedAt: string;
  expectedQuantity: number;
  pallets: Pallet[];
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

export function CountFlowView() {
  const searchParams = useSearchParams();
  const { warehouse, source, completeCount, auditPlan } = useWarehouse();
  const [binCode, setBinCode] = useState(
    searchParams.get("bin")?.toUpperCase() ?? "",
  );
  const [taskId] = useState(searchParams.get("taskId") ?? undefined);
  const [lookup, setLookup] = useState<LookupBin | null>(null);
  const [countedQuantity, setCountedQuantity] = useState(0);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const pendingTask = useMemo(() => {
    if (!auditPlan || !taskId) return null;
    return auditPlan.tasks.find((t) => t.id === taskId) ?? null;
  }, [auditPlan, taskId]);

  useEffect(() => {
    if (pendingTask && !lookup) {
      setLookup({
        id: pendingTask.bin.id,
        code: pendingTask.bin.code,
        riskScore: pendingTask.bin.riskScore,
        lastCheckedAt: pendingTask.bin.lastCheckedAt,
        expectedQuantity: pendingTask.expectedQuantity,
        pallets: pendingTask.bin.pallets,
      });
      setBinCode(pendingTask.bin.code);
      setCountedQuantity(pendingTask.expectedQuantity);
    }
  }, [pendingTask, lookup]);

  async function searchBin(codeOverride?: string) {
    setError(null);
    setSuccess(null);
    const code = (codeOverride ?? binCode).trim().toUpperCase();
    if (!code) {
      setError("Enter a bin code to search.");
      return;
    }
    setBinCode(code);

    if (source === "api") {
      setBusy(true);
      try {
        const res = await fetch(`/api/audits/bins/${encodeURIComponent(code)}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(body?.message ?? "Bin not found");
        }
        const data = (await res.json()) as LookupBin;
        setLookup(data);
        setCountedQuantity(data.expectedQuantity);
      } catch (e) {
        setLookup(null);
        setError(e instanceof Error ? e.message : "Bin not found");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!warehouse) {
      setError("No warehouse loaded");
      return;
    }
    const bin = listBins(warehouse).find(
      (b) => b.code.toUpperCase() === code,
    );
    if (!bin) {
      setLookup(null);
      setError(`Bin ${code} not found`);
      return;
    }
    setLookup({
      id: bin.id,
      code: bin.code,
      riskScore: bin.riskScore,
      lastCheckedAt: bin.lastCheckedAt,
      expectedQuantity: bin.pallets.length,
      pallets: bin.pallets,
    });
    setCountedQuantity(bin.pallets.length);
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function startScan() {
    setError(null);
    setSuccess(null);

    const Detector = (
      window as Window & {
        BarcodeDetector?: new (options?: {
          formats?: string[];
        }) => BarcodeDetectorLike;
      }
    ).BarcodeDetector;

    if (!Detector) {
      setError(
        "Camera barcode scan is not supported here. Type the bin code or use a keyboard wedge scanner in the field.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const video = videoRef.current;
      if (!video) {
        stopScan();
        return;
      }
      video.srcObject = stream;
      await video.play();

      const detector = new Detector({
        formats: ["code_128", "qr_code", "code_39", "ean_13"],
      });

      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue?.trim();
          if (value) {
            stopScan();
            await searchBin(value);
            return;
          }
        } catch {
          // keep scanning
        }
        if (streamRef.current) {
          window.setTimeout(() => void tick(), 250);
        }
      };
      void tick();
    } catch {
      stopScan();
      setError("Could not open the camera for scanning.");
    }
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function submit(result: AuditPassFail) {
    if (!lookup) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await completeCount({
        binId: lookup.id,
        binCode: lookup.code,
        taskId,
        countedQuantity,
        result,
      });
      setSuccess(
        `Marked ${lookup.code} as ${result}. Score recomputed for this bin.`,
      );
      setLookup(null);
      setBinCode("");
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Count failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3">
        <PageBackLink href={taskId ? "/audit" : "/"}>
          {taskId ? "Audit plan" : "Dashboard"}
        </PageBackLink>
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.25em] uppercase">
            Mobile count
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            Count a bin
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Search or scan a bin code, confirm expected pallets, enter counted
            quantity, then mark pass or fail.
          </p>
        </div>
      </div>

      {success ? (
        <div
          ref={successRef}
          role="status"
          aria-live="polite"
          tabIndex={-1}
          className="border-foreground/15 bg-muted/50 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 outline-none"
        >
          <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-sm font-medium">{success}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bin-code" className="font-mono text-xs">
            Bin code
          </Label>
          <div className="flex gap-2">
            <Input
              id="bin-code"
              value={binCode}
              onChange={(e) => setBinCode(e.target.value.toUpperCase())}
              placeholder="e.g. A01-R01-B01"
              className="font-mono"
              autoCapitalize="characters"
              enterKeyHint="search"
              onKeyDown={(e) => {
                if (e.key === "Enter") void searchBin();
              }}
            />
            <Button
              type="button"
              disabled={busy}
              onClick={() => void searchBin()}
            >
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || scanning}
              onClick={() => void startScan()}
              aria-label="Scan barcode"
            >
              <ScanBarcodeIcon className="size-4" />
              Scan
            </Button>
          </div>
          {scanning ? (
            <div className="flex flex-col gap-2">
              <video
                ref={videoRef}
                className="border-border/60 aspect-video w-full rounded-lg border bg-black object-cover"
                muted
                playsInline
              />
              <Button type="button" variant="outline" size="sm" onClick={stopScan}>
                Stop scan
              </Button>
            </div>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>

      {lookup ? (
        <section className="border-border/60 flex flex-col gap-4 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-mono text-lg font-semibold">{lookup.code}</h2>
            <RiskBadge score={lookup.riskScore} />
          </div>
          <p className="text-muted-foreground font-mono text-xs">
            Last checked {new Date(lookup.lastCheckedAt).toLocaleString()}
          </p>

          <div>
            <h3 className="mb-2 font-mono text-xs tracking-wider uppercase">
              Expected pallets ({lookup.expectedQuantity})
            </h3>
            {lookup.pallets.length === 0 ? (
              <p className="text-muted-foreground text-sm">Empty bin</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {lookup.pallets.map((p) => (
                  <li
                    key={p.id}
                    className="border-border/50 rounded-md border px-3 py-2 text-sm"
                  >
                    {p.skuLabel}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="counted-qty" className="font-mono text-xs">
              Counted quantity
            </Label>
            <Input
              id="counted-qty"
              type="number"
              min={0}
              value={countedQuantity}
              onChange={(e) => setCountedQuantity(Number(e.target.value) || 0)}
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={busy}
              onClick={() => void submit("PASS")}
            >
              {busy ? "Saving…" : "Pass"}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void submit("FAIL")}
            >
              {busy ? "Saving…" : "Fail"}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
