"use client";

import { SessionProvider } from "@/components/providers/SessionProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
