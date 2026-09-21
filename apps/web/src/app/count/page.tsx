import { Suspense } from "react";
import { CountFlowView } from "@/components/count-flow-view";

export default function CountPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center font-mono text-sm">
          Loading count flow…
        </div>
      }
    >
      <CountFlowView />
    </Suspense>
  );
}
