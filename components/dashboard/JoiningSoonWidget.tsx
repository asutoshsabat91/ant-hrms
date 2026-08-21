"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

export interface OnboardingHire {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
  joiningDate: Date;
  status: string;
  progress?: number;
}

export function JoiningSoonWidget({ hires }: { hires: OnboardingHire[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const displayHires = hires.map((h, i) => ({
    ...h,
    progress: h.progress ?? [35, 90, 75, 100][i % 4]
  }));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col h-full transition-all duration-500 ease-[var(--ease-out-expo)] hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-zinc-900">
          Joining <span className="italic-serif text-base font-light">soon</span>
        </h3>
        <Link
          href="/onboarding"
          className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-950 flex items-center gap-1 transition-colors"
        >
          View pipeline <span className="text-[11px] transition-transform duration-300 hover:translate-x-1">→</span>
        </Link>
      </div>
      <div className="space-y-4 flex-1">
        {displayHires.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-zinc-400 font-medium text-xs">
            No upcoming hires scheduled
          </div>
        ) : (
          displayHires.map((hire) => {
            const initials = `${hire.firstName[0] || ""}${hire.lastName[0] || ""}`;
            return (
              <div key={hire.id} className="group/item flex items-center justify-between gap-4 pb-3 border-b border-zinc-100 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-zinc-100 transition-all duration-300 group-hover/item:scale-105 group-hover/item:border-zinc-300">
                    <AvatarFallback className="bg-zinc-100 text-zinc-800 text-xs font-bold transition-colors duration-300 group-hover/item:bg-[var(--purple-light)] group-hover/item:text-[var(--purple)]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 leading-tight transition-colors duration-300 group-hover/item:text-[var(--purple)]">
                      {hire.firstName} {hire.lastName}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                      {hire.designation}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 min-w-[80px]">
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider leading-none">
                      JOINS
                    </p>
                    <p className="text-[10px] font-bold text-zinc-900 mt-0.5 leading-none">
                      {format(new Date(hire.joiningDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 rounded-full transition-all duration-1000 ease-[var(--ease-out-expo)]"
                      style={{ width: mounted ? `${hire.progress}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
