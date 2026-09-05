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
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">{subtitle}</p>
        )}
      </div>
      {href && (
        <Link
          to={href.to}
          className="group inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          {href.label ?? "See all"}
          <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
