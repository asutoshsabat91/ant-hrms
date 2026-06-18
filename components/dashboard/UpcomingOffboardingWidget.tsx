import Link from "next/link";
import { UserMinus } from "lucide-react";
import { differenceInDays } from "date-fns";

interface OffboardingEmployee {
  id: string;
  firstName: string;
  lastName: string;
  lastWorkingDate: string | Date | null;
  designation: string;
}

export function UpcomingOffboardingWidget({ employees }: { employees: OffboardingEmployee[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Upcoming Exits</p>
        <Link href="/offboarding" className="text-[10px] font-semibold text-[var(--purple)]">View all →</Link>
      </div>
      {employees.length === 0 ? (
        <p className="text-xs text-zinc-400 py-4 text-center">No upcoming exits in 30 days</p>
      ) : (
        <div className="space-y-2.5">
          {employees.map((emp) => {
            const daysLeft = emp.lastWorkingDate
              ? differenceInDays(new Date(emp.lastWorkingDate), new Date())
              : null;
            return (
              <Link
                key={emp.id}
                href={`/offboarding/${emp.id}`}
                className="flex items-center justify-between hover:bg-zinc-50 rounded-lg p-1.5 -mx-1.5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                    <UserMinus className="h-3.5 w-3.5 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">{emp.firstName} {emp.lastName}</p>
                    <p className="text-[10px] text-zinc-400">{emp.designation}</p>
                  </div>
                </div>
                {daysLeft !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    daysLeft <= 3 ? "bg-rose-50 text-rose-600" :
                    daysLeft <= 7 ? "bg-amber-50 text-amber-600" :
                    "bg-zinc-50 text-zinc-500"
                  }`}>
                    {daysLeft === 0 ? "Today" : `${daysLeft}d`}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
