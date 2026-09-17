"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWarehouse } from "@/components/warehouse-provider";
import { Badge } from "@/components/ui/badge";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/setup", label: "Setup" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { source, warehouse } = useWarehouse();

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="group flex min-w-0 flex-col">
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
              Smart Cycle Count
            </span>
            <span className="truncate text-sm font-semibold tracking-tight sm:text-base">
              Scoring
            </span>
          </Link>
          {warehouse ? (
            <Badge variant="secondary" className="hidden font-mono text-[10px] sm:inline-flex">
              {warehouse.name}
            </Badge>
          ) : null}
        </div>

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Button
                key={link.href}
                asChild
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className={cn("font-mono text-xs", active && "bg-secondary")}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            );
          })}
          <Badge
            variant="outline"
            className="ml-1 hidden font-mono text-[10px] md:inline-flex"
          >
            {source === "api" ? "LIVE" : "LOCAL"}
          </Badge>
        </nav>
      </div>
    </header>
  );
}
