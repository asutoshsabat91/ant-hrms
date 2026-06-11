import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Cake } from "lucide-react";

export interface BirthdayEntry {
  id: string;
  name: string;
  date: Date;
  type: "birthday" | "anniversary";
  years?: number;
}

export function BirthdayWidget({ entries }: { entries: BirthdayEntry[] }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
      <div className="mb-4 flex items-center gap-2">
        <Cake className="h-4 w-4 text-[var(--brand-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--brand-secondary)]">
          This Week
        </h3>
      </div>
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-xs text-[var(--neutral-400)]">No celebrations this week.</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-[var(--brand-primary)] text-white">
                  {e.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.name}</p>
                <p className="text-xs text-[var(--neutral-600)]">
                  {e.type === "birthday" ? "Birthday" : `${e.years}yr anniversary`} ·{" "}
                  {format(e.date, "MMM d")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
