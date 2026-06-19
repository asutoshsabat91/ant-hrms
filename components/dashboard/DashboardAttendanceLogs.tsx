"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { format } from "date-fns";

interface Punch {
  id: string;
  punchType: "IN" | "OUT";
  punchedAt: string;
  location?: string | null;
}

interface Props {
  punches: Punch[];
}

export function DashboardAttendanceLogs({ punches }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm space-y-4">
      {/* Header + clock */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--purple)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Attendance Logs</span>
        </div>
        <span className="text-2xl font-mono font-bold text-zinc-900 tabular-nums">
          {format(time, "HH:mm:ss")}
        </span>
      </div>

      {/* Today's punch log — capped height with scroll */}
      {punches.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Today&apos;s Log</p>
            <span className="text-[9px] font-semibold text-zinc-300">{punches.length} entries</span>
          </div>
          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
            {punches.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5">
                <span className={`text-xs font-semibold ${p.punchType === "IN" ? "text-emerald-600" : "text-rose-500"}`}>
                  {p.punchType === "IN" ? "↑ In" : "↓ Out"}
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  {format(new Date(p.punchedAt), "hh:mm a")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-zinc-400">
          <p className="text-xs font-bold text-zinc-800">No punches registered today</p>
          <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Please clock in from the Attendance section.</p>
        </div>
      )}
    </div>
  );
}
