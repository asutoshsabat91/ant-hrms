import { IndianRupee, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface PayrollRun {
  status: string;
  month: number;
  year: number;
  totalNet?: number | null;
  totalGross?: number | null;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function PayrollSummaryCard({ run }: { run: PayrollRun | null }) {
  if (!run) return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-5 flex flex-col justify-between h-full">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Payroll</p>
      <div className="flex flex-col items-center justify-center h-24 gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-400" />
        <p className="text-xs text-zinc-400">No payroll run yet this month</p>
        <Link href="/payroll" className="text-xs font-semibold text-[var(--purple)] hover:underline">Run payroll →</Link>
      </div>
    </div>
  );

  const StatusIcon = run.status === "PAID" ? CheckCircle2 : Clock;
  const statusColor = run.status === "PAID" ? "text-emerald-600" : "text-amber-600";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 h-full flex flex-col justify-between">
      <div>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Payroll</p>
        <p className="text-sm font-semibold text-zinc-700">{MONTH_NAMES[run.month - 1]} {run.year}</p>
        <div className={`flex items-center gap-1.5 mt-1 mb-3 ${statusColor}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">{run.status}</span>
        </div>
        {run.totalNet != null && (
          <div>
            <p className="text-xs text-zinc-400">Net disbursed</p>
            <p className="text-xl font-extrabold text-zinc-900 flex items-center gap-0.5">
              <IndianRupee className="h-4 w-4 text-zinc-500" />
              {run.totalNet.toLocaleString("en-IN")}
            </p>
          </div>
        )}
      </div>
      <Link href="/payroll" className="text-xs font-semibold text-[var(--purple)] hover:underline mt-3 block">
        View details →
      </Link>
    </div>
  );
}
