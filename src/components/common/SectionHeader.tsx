import { Link } from "@/lib/next-router-compat";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeader({
  title,
  subtitle,
  href,
}: {
  title: ReactNode;
  subtitle?: string;
  href?: { to: string; label?: string };
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      {href && (
        <Link
          to={href.to}
          className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary hover:underline"
        >
          {href.label ?? "See all"} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

