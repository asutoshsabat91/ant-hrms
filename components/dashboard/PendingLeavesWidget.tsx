import Link from "next/link";

interface PendingLeave {
  id: string;
  employee: { firstName: string; lastName: string; employeeId: string };
  leaveType: { name: string };
  days: number;
}

export function PendingLeavesWidget({ leaves, count }: { leaves: PendingLeave[]; count: number }) {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
          Pending Leaves
          {count > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">
              {count}
            </span>
          )}
        </p>
        <Link href="/leave" className="text-[10px] font-semibold text-amber-700">Review all →</Link>
      </div>
      {leaves.length === 0 ? (
        <p className="text-xs text-amber-600/60 py-2 text-center">No pending approvals</p>
      ) : (
        <div className="space-y-2">
          {leaves.map((leave) => (
            <div key={leave.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
              <div>
                <p className="text-xs font-semibold text-zinc-800">
                  {leave.employee.firstName} {leave.employee.lastName}
                </p>
                <p className="text-[10px] text-zinc-400">{leave.leaveType.name} · {leave.days}d</p>
              </div>
              <Link href={`/leave`} className="text-[10px] font-bold text-[var(--purple)] hover:underline">
                Review →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
