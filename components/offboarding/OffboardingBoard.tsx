import Link from "next/link";
import { format, parseISO, differenceInDays } from "date-fns";
import { UserMinus, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

type OffboardingEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: { name: string };
  manager?: { firstName: string; lastName: string } | null;
  lastWorkingDate: string | null;
  offboardingTasks: { id: string; status: string; dueDate: string | null }[];
};

interface OffboardingBoardProps {
  employees: OffboardingEmployee[];
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  const color = percent >= 80 ? "#10b981" : percent >= 40 ? "#f59e0b" : "#f43f5e";
  return (
    <svg width="52" height="52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#f4f4f5" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
        {percent}%
      </text>
    </svg>
  );
}

function UrgencyBadge({ lastWorkingDate }: { lastWorkingDate: string | null }) {
  if (!lastWorkingDate) return null;
  const days = differenceInDays(parseISO(lastWorkingDate), new Date());
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
      <AlertTriangle className="h-2.5 w-2.5" />Overdue
    </span>
  );
  if (days <= 2) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
      <Clock className="h-2.5 w-2.5" />{days}d left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
      <Clock className="h-2.5 w-2.5" />{days}d left
    </span>
  );
}

export function OffboardingBoard({ employees }: OffboardingBoardProps) {
  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 py-16 px-8 text-center h-full min-h-[260px]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 mb-4">
          <UserMinus className="h-6 w-6 text-zinc-400" />
        </div>
        <p className="text-sm font-semibold text-zinc-700">No active offboarding</p>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          No employees are currently in the offboarding pipeline. Use the form on the right to initiate an exit process.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Pipeline</p>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
          {employees.length} employee{employees.length !== 1 ? "s" : ""}
        </span>
      </div>
      {employees.map((emp) => {
        const total = emp.offboardingTasks.length || 1;
        const done = emp.offboardingTasks.filter((t) => t.status === "COMPLETED").length;
        const open = emp.offboardingTasks.filter((t) => t.status !== "COMPLETED").length;
        const percent = Math.round((done / total) * 100);
        return (
          <Link
            key={emp.id}
            href={`/offboarding/${emp.id}`}
            className="group flex items-center gap-4 rounded-xl border border-zinc-100 bg-white p-4 shadow-sm transition-all hover:border-[var(--purple)]/40 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white text-sm font-bold uppercase">
              {emp.firstName[0]}{emp.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-zinc-900 truncate">
                  {emp.firstName} {emp.lastName}
                </p>
                <UrgencyBadge lastWorkingDate={emp.lastWorkingDate} />
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{emp.designation} · {emp.department.name}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />{done} done
                </span>
                <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <Clock className="h-3 w-3 text-amber-500" />{open} pending
                </span>
                {emp.lastWorkingDate && (
                  <span className="text-[10px] text-zinc-400">
                    Last day: {format(parseISO(emp.lastWorkingDate), "dd MMM")}
                  </span>
                )}
              </div>
            </div>
            <ProgressRing percent={percent} />
          </Link>
        );
      })}
    </div>
  );
}
