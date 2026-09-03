"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Fresh15AiAssistant } from "../common/Fresh15AiAssistant";
import { Fresh15AiAgent } from "../common/Fresh15AiAgent";
import { PersonalizedPicks, SmartBasket } from "../common/PersonalizedProductRail";
import { PersonalizedOffers } from "../common/PersonalizedOffers";

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar />
      <main className="flex-1 pb-24 sm:pb-8 animate-page">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
          {children}
          {isHome && (
            <>
              <SmartBasket />
              <PersonalizedPicks />
              <PersonalizedOffers />
            </>
          )}
        </div>
      </main>
      <BottomNav />
      <Fresh15AiAssistant />
      <Fresh15AiAgent />
    </div>
  );
}
