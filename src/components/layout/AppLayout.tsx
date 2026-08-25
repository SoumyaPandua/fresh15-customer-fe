import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Fresh15AiAssistant } from "@/components/common/Fresh15AiAssistant";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar />
      <main className="flex-1 pb-24 sm:pb-8 animate-page">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">{children}</div>
      </main>
      <BottomNav />
      <Fresh15AiAssistant />
    </div>
  );
}
