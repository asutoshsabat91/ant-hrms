"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const response = await fetch("/api/notifications");
        const payload = await response.json();
        if (response.ok) {
          setCount(payload.unreadCount ?? 0);
        }
      } catch {
        setCount(0);
      }
    }

    fetchCount();
  }, []);

  return (
    <Link
      href="/notifications"
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
    >
      <Bell className="h-5 w-5 text-[var(--neutral-600)]" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
