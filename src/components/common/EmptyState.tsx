import type { ReactNode } from "react";
import { Link } from "@/lib/next-router-compat";

type Props = {
  emoji?: string;
  title: string;
  description?: string;
  cta?: { label: string; to: string };
  action?: ReactNode;
};

export function EmptyState({ emoji = "🛒", title, description, cta, action }: Props) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-3xl border border-dashed bg-surface p-10 text-center">
      <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-muted text-5xl">{emoji}</div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      {cta && (
        <Link
          to={cta.to}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
        >
          {cta.label}
        </Link>
      )}
      {action}
    </div>
  );
}
