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
      .slice(0, 2); // Show next 2 holidays to align perfectly
  }, [holidays]);

  return (
    <div className="rounded-2xl border border-zinc-150 bg-gradient-to-br from-zinc-900 via-zinc-950 to-violet-950 p-4 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:border-violet-500/20 group lg:h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">Upcoming Holidays</span>
        </div>
        <span className="text-[8px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
          Season 2026
        </span>
      </div>

      {upcoming.length === 0 ? (
        <div className="flex items-center justify-center py-4 text-zinc-500 gap-2">
          <Calendar className="h-4 w-4" />
          <p className="text-[10px] font-semibold">No upcoming holidays.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {upcoming.map((h) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = differenceInCalendarDays(h.dateObj, today);

            let relativeTime = "";
            if (diffDays === 0) relativeTime = "Today";
            else if (diffDays === 1) relativeTime = "Tomorrow";
            else relativeTime = `${diffDays} days left`;

            return (
              <div
                key={h.name}
                className="relative overflow-hidden rounded-xl bg-white/5 border border-white/5 p-2 flex flex-col justify-between hover:bg-white/10 transition-all duration-300 cursor-default group/item hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-2">
                  {/* Date Badge */}
                  <div className="flex flex-col items-center justify-center h-8 w-8 rounded-lg bg-white/10 border border-white/10 text-center flex-shrink-0">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase leading-none">
                      {format(h.dateObj, "MMM")}
                    </span>
                    <span className="text-xs font-black text-white leading-none mt-0.5">
                      {format(h.dateObj, "d")}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-[11px] font-extrabold text-zinc-100 group-hover/item:text-violet-300 transition-colors leading-tight truncate" title={h.name}>
                      {h.name}
                    </h4>
                    <p className="text-[8px] font-medium text-zinc-400 leading-none mt-0.5">
                      {format(h.dateObj, "EEEE")}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
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
