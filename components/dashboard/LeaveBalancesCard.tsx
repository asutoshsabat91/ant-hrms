"use client";

import { CalendarDays } from "lucide-react";

const COLORS: Record<string, string> = {
  PAID_QUARTER: "bg-sky-400",
  LOP: "bg-rose-400",
  ACADEMIC: "bg-blue-400",
  EARNED: "bg-emerald-400",
  FLOATER: "bg-amber-400",
  BEREAVEMENT: "bg-pink-400",
  COMP_OFF: "bg-indigo-400",
  OPTIONAL_HOLIDAY: "bg-violet-400",
  WFH: "bg-emerald-300",
};
interface Balance {
  leaveType: { name: string; code: string };
  allocated: number;
  used: number;
  pending: number;
}

interface Props {
  balances: Balance[];
}



export function LeaveBalancesCard({ balances }: Props) {
  const displayBalances = balances || [];

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-[var(--purple)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Leave Balances</span>
      </div>

      {displayBalances.length === 0 ? (
        <p className="text-xs text-zinc-400">No leave balances found for this year.</p>
      ) : (
        <div className="space-y-3">
          {displayBalances.map((b) => {
            if (!b || !b.leaveType) return null;
            const remaining = Math.max(0, b.allocated - b.used - b.pending);
            const usedPct = b.allocated > 0 ? Math.min(100, ((b.used + b.pending) / b.allocated) * 100) : 0;
            const color = COLORS[b.leaveType.code] || "bg-zinc-400";

            const ratio = b.allocated > 0 ? (remaining / b.allocated) : 1;
            const urgencyClass = ratio === 0 ? "urgency-empty" : ratio < 0.3 ? "urgency-high" : "urgency-normal";

            return (
              <div key={b.leaveType.code} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-700">{b.leaveType.name}</span>
                  {b.allocated > 0 ? (
                    <span className={`text-[10px] font-semibold text-zinc-400 leave-remaining-text ${urgencyClass}`}>
                      {remaining} / {b.allocated} left
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-zinc-400">
                      {b.used + b.pending} taken
                    </span>
                  )}
                </div>
                {b.allocated > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full transition-all ${color}`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

