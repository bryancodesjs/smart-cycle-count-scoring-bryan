"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWarehouse } from "@/components/warehouse-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SetupView() {
  const router = useRouter();
  const { setupWarehouse, loadDemo } = useWarehouse();
  const [name, setName] = useState("Main Warehouse");
  const [aisleCount, setAisleCount] = useState(3);
  const [racksPerAisle, setRacksPerAisle] = useState(4);
  const [binsPerRack, setBinsPerRack] = useState(5);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await setupWarehouse({
        name,
        aisleCount: Math.max(1, Math.min(20, aisleCount)),
        racksPerAisle: Math.max(1, Math.min(20, racksPerAisle)),
        binsPerRack: Math.max(1, Math.min(20, binsPerRack)),
      });
      router.push("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-muted-foreground font-mono text-[10px] tracking-[0.25em] uppercase">
          Warehouse setup
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Define layout
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Aisles contain racks; racks contain bins (up to 4 pallets each).
        </p>
      </div>

      <Card>
        <form onSubmit={(e) => void onSubmit(e)}>
          <CardHeader>
            <CardTitle className="text-base">Dimensions</CardTitle>
            <CardDescription>
              Creates empty bins ready for pallet placement and scoring.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Warehouse name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="aisles">Aisles</Label>
                <Input
                  id="aisles"
                  type="number"
                  min={1}
                  max={20}
                  value={aisleCount}
                  onChange={(e) => setAisleCount(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="racks">Racks / aisle</Label>
                <Input
                  id="racks"
                  type="number"
                  min={1}
                  max={20}
                  value={racksPerAisle}
                  onChange={(e) => setRacksPerAisle(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bins">Bins / rack</Label>
                <Input
                  id="bins"
                  type="number"
                  min={1}
                  max={20}
                  value={binsPerRack}
                  onChange={(e) => setBinsPerRack(Number(e.target.value))}
                />
              </div>
            </div>
            <p className="text-muted-foreground font-mono text-xs">
              Total bins:{" "}
              <span className="text-foreground font-semibold">
                {aisleCount * racksPerAisle * binsPerRack}
              </span>
            </p>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create warehouse"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                loadDemo();
                router.push("/");
              }}
            >
              Load demo instead
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
