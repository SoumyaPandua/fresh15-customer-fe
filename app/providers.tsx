"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useTheme, applyThemeClass } from "@/lib/store/theme";
import { useRealtimeSocket } from "@/lib/hooks/use-realtime-socket";

function ThemeBridge() {
  const theme = useTheme((s) => s.theme);
  applyThemeClass(theme);
  return null;
}

function RealtimeBridge() {
  useRealtimeSocket();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBridge />
      <RealtimeBridge />
      {children}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
