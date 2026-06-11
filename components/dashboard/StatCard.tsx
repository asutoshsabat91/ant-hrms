import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  trend?: { value: number; direction: "up" | "down" };
}

export function StatCard({
  label,
  value,
  subtext,
  trend,
}: StatCardProps) {
  return (
    <div className="group rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_20px_35px_rgba(0,0,0,0.03),0_0_20px_var(--purple-light)] hover:border-[rgba(142,67,172,0.2)]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-500 transition-colors duration-300">
          {label}
        </p>
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--purple)]/30 transition-all duration-500 group-hover:bg-[var(--purple)] group-hover:scale-125 group-hover:shadow-[0_0_8px_var(--purple)]" />
      </div>
      <p className="mt-2 text-3xl font-extrabold text-zinc-950 leading-tight tracking-tight">
        {value}
      </p>
      {subtext && (
        <p className="mt-1 text-[10px] font-medium text-zinc-400 group-hover:text-zinc-500 transition-colors duration-300">
          {subtext}
        </p>
      )}
      {trend && (
        <p
          className={cn(
            "mt-1 text-[10px] font-semibold",
            trend.direction === "up" ? "text-emerald-500" : "text-rose-500"
          )}
        >
          {trend.direction === "up" ? "↑" : "↓"} {trend.value}%
        </p>
      )}
    </div>
  );
}

