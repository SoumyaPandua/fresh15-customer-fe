"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const HomePage = dynamic<ComponentType>(
  () =>
    import("@/routes/index").then(
      ({ Route }) => Route.component as ComponentType,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
            aria-label="Loading Fresh15"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Loading Fresh15…
          </p>
        </div>
      </div>
    ),
  },
);

export default function Page() {
  return <HomePage />;
}
