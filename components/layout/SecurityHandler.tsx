"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

export function SecurityHandler() {
  const { status } = useSession();

  useEffect(() => {
    if (typeof window === "undefined" || typeof performance === "undefined") return;

    // 1. Detect if the user lands on this page via the browser back/forward buttons (from cache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Force a page reload from the server, causing middleware/auth check to trigger
        window.location.reload();
      }
    };

    // 2. Detect if the page was refreshed / reloaded
    const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const isReload = navigationEntry?.type === "reload" || performance.navigation.type === 1;

    if (isReload && status === "authenticated") {
      // Force sign out on refresh and redirect to login
      signOut({ callbackUrl: "/login" });
      return;
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [status]);

  return null;
}
