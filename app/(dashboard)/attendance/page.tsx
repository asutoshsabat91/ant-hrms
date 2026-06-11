import { Download } from "lucide-react";
import { auth } from "@/auth";
import { getAttendanceOverview } from "@/lib/attendance";
import { AttendancePageClient } from "@/components/attendance/AttendancePageClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function formatTime(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function formatWorkDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatHours(value: number | null | undefined) {
  if (!value) return "0h 00m";
  const minutes = Math.round(value * 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export default async function AttendancePage() {
  const session = await auth();
  const isAdminOrManager = 
    session?.user?.role === "SUPER_ADMIN" || 
    session?.user?.role === "HR_ADMIN" || 
    session?.user?.role === "MANAGER";

  const { weeklyRecords } = await getAttendanceOverview();

  return (
    <div className="space-y-6">
      {/* Client Punch Controls and personal stats */}
      <AttendancePageClient />

      {/* Admin Team Attendance table */}
      {isAdminOrManager && (
        <div className="space-y-4 pt-6">
          <div className="flex items-center justify-between border-t border-zinc-150 pt-6">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Team attendance management
              </h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Weekly attendance records with first punch, latest punch, total hours, and status.
              </p>
            </div>
            <a
              href="/api/attendance/export"
              download="Attendance_Report.csv"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-zinc-500" />
              Export CSV
            </a>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-zinc-500">
                <thead className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th scope="col" className="px-6 py-4">Employee</th>
                    <th scope="col" className="px-6 py-4">Date</th>
                    <th scope="col" className="px-6 py-4">First punch</th>
                    <th scope="col" className="px-6 py-4">Latest punch</th>
                    <th scope="col" className="px-6 py-4">Punches</th>
                    <th scope="col" className="px-6 py-4">Total</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {weeklyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-zinc-400">
                        No team attendance records found.
                      </td>
                    </tr>
                  ) : (
                    weeklyRecords.slice(0, 12).map((record) => {
                      const firstPunch = record.punches[0];
                      const lastPunch = record.punches.at(-1);
                      const name = `${record.employee.firstName} ${record.employee.lastName}`;
                      const initials = `${record.employee.firstName[0]}${record.employee.lastName[0]}`;
                      return (
                        <tr key={record.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-zinc-100">
                                <AvatarFallback className="bg-zinc-100 text-zinc-800 text-[10px] font-bold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-bold text-zinc-900">{name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-zinc-900">
                            {formatWorkDate(record.workDate)}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-zinc-900">
                            {formatTime(firstPunch?.punchedAt ?? record.checkIn)}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-zinc-900">
                            {formatTime(lastPunch?.punchedAt ?? record.checkOut)}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-zinc-900">
                            {record.punches.length}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-zinc-900">
                            {formatHours(record.totalHours)}
                          </td>
                          <td className="px-6 py-4">
                            {record.status === "PRESENT" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                <span className="h-1 w-1 rounded-full bg-amber-500" />
                                {record.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
