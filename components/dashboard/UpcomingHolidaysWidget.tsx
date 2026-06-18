"use client";

import { useMemo } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { Sparkles, Calendar } from "lucide-react";

interface Holiday {
  date: string; // ISO string
  name: string;
}

interface Props {
  holidays: Holiday[];
}

export function UpcomingHolidaysWidget({ holidays }: Props) {
  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (holidays || [])
      .map((h) => ({
        ...h,
        dateObj: new Date(h.date),
      }))
      .filter((h) => h.dateObj >= today)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(0, 3);
  }, [holidays]);

  return (
    <div className="rounded-2xl border border-zinc-150 bg-gradient-to-br from-zinc-900 via-zinc-950 to-violet-950 p-5 text-white shadow-lg space-y-4 hover:shadow-xl transition-all duration-300 hover:border-violet-500/30 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Upcoming Holidays</span>
        </div>
        <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
          2026 Season
        </span>
      </div>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-500">
          <Calendar className="h-8 w-8 mb-2 stroke-1" />
          <p className="text-xs font-semibold">No upcoming holidays this season.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {upcoming.map((h) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = differenceInCalendarDays(h.dateObj, today);

            let relativeTime = "";
            if (diffDays === 0) relativeTime = "Today";
            else if (diffDays === 1) relativeTime = "Tomorrow";
            else relativeTime = `In ${diffDays} days`;

            return (
              <div
                key={h.name}
                className="relative overflow-hidden rounded-xl bg-white/5 border border-white/5 p-3 flex items-center justify-between hover:bg-white/10 transition-all duration-300 cursor-default group/item hover:-translate-y-0.5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {/* Styled Date Badge */}
                  <div className="flex flex-col items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-b from-white/10 to-white/5 border border-white/10 text-center shadow-inner">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase leading-none">
                      {format(h.dateObj, "MMM")}
                    </span>
                    <span className="text-sm font-black text-white leading-none mt-1">
                      {format(h.dateObj, "d")}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-100 group-hover/item:text-violet-300 transition-colors leading-tight">
                      {h.name}
                    </h4>
                    <p className="text-[9px] font-semibold text-zinc-400 mt-0.5">
                      {format(h.dateObj, "EEEE")}
                    </p>
                  </div>
                </div>

                {/* relative time flag */}
                <div className="text-right">
                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    diffDays <= 7
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-zinc-800 text-zinc-300 border border-zinc-700/50"
                  }`}>
                    {relativeTime}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
