"use client";

import { useEffect } from "react";
import { Home, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "next_app_error_boundary" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-destructive/10 text-4xl">😕</div>
        <h1 className="text-2xl font-black tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">We hit a snag loading this page. Try again or head home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => reset()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
            <RefreshCcw className="h-4 w-4" /> Try again
          </button>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border bg-surface-elevated px-5 py-2.5 text-sm font-semibold">
            <Home className="h-4 w-4" /> Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
