"use client";

import { CloudOffIcon, DatabaseIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  source: "api" | "local";
  className?: string;
};

/**
 * Shows whether warehouse data is coming from the live API/DB
 * or from offline browser storage (localStorage fallback).
 */
export function DataSourceBadge({ source, className }: Props) {
  const isLive = source === "api";
  const label = isLive ? "Live" : "Local";
  const description = isLive
    ? "Connected to the Postgres database via the API."
    : "Offline mode — using browser-stored local data. Start the API and refresh to go live.";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "cursor-default font-mono text-[10px]",
            isLive
              ? "border-emerald-600/30 text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-300"
              : "border-amber-600/35 text-amber-900 dark:border-amber-400/35 dark:text-amber-200",
            className,
          )}
          aria-label={description}
        >
          {isLive ? (
            <DatabaseIcon data-icon="inline-start" aria-hidden />
          ) : (
            <CloudOffIcon data-icon="inline-start" aria-hidden />
          )}
          <span>{label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px] text-xs">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
