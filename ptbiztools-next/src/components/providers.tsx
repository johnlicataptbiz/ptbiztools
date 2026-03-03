"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { SessionProvider } from "@/lib/auth/session-context";
import { ThemeProvider } from "@/lib/theme/theme-context";
import { TourProvider } from "@/lib/tour/tour-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SessionProvider>
          <TourProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TourProvider>
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
