import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Hierarchical “return to parent” control — sits above the page title,
 * not in the action button row (those are for forward workflow steps).
 */
export function PageBackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-muted-foreground hover:text-foreground -ml-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1.5 py-1 text-sm transition-colors",
        className,
      )}
    >
      <ChevronLeftIcon className="size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </Link>
  );
}
