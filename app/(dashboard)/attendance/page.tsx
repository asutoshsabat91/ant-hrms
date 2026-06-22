import { Download, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceOverview } from "@/lib/attendance";
import { AttendancePageClient } from "@/components/attendance/AttendancePageClient";
import { RegularizationApprovalList } from "@/components/attendance/RegularizationApprovalList";
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
  const isSuperAdmin = session?.user?.role === "ADMIN";
  const isCompanyAdmin = session?.user?.role === "COMPANY_ADMIN";
  const isAdminOrManager = isSuperAdmin || isCompanyAdmin;
  const managedCompany = session?.user?.managedCompany || undefined;

  const { weeklyRecords } = await getAttendanceOverview(managedCompany);

  // Load pending regularization requests for Admin
  const pendingRequests = isAdminOrManager
    ? await prisma.regularizationRequest.findMany({
        where: {
          status: "PENDING",
          ...(isCompanyAdmin && managedCompany
            ? { employee: { deployedCompany: managedCompany } }
            : {}),
        },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const serializedRequests = pendingRequests.map((r) => ({
    ...r,
    date: r.date.toISOString(),
    clockIn: r.clockIn ? r.clockIn.toISOString() : null,
    clockOut: r.clockOut ? r.clockOut.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      {/* Client Punch Controls and personal stats */}
      <AttendancePageClient />

      {/* Admin Regularization Approvals Dashboard */}
      {isAdminOrManager && (
        <div className="space-y-4 pt-6 border-t border-zinc-150">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Pending Regularization Requests
            </h3>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Approve or reject manual attendance adjustment applications from teammates.
            </p>
          </div>
          <RegularizationApprovalList initialRequests={serializedRequests} />
        </div>
      )}

      {/* Admin Team Attendance table */}
      {isAdminOrManager && (
        <div className="space-y-4 pt-6">
          <div className="flex items-center justify-between border-t border-zinc-150 pt-6">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Team attendance management
              </h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Weekly attendance logs showing work duration cycle and total effective hours.
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
                    <th scope="col" className="px-6 py-4">Work Duration Cycle / Log Timeline</th>
                    <th scope="col" className="px-6 py-4">Total Effective</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {weeklyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-zinc-400">
                        No team attendance records found.
                      </td>
                    </tr>
                  ) : (
                    weeklyRecords.slice(0, 12).map((record) => {
                      const firstPunch = record.punches[0];
                      const lastPunch = record.punches.at(-1);
                      const name = `${record.employee.firstName} ${record.employee.lastName}`;
                      const initials = `${record.employee.firstName[0]}${record.employee.lastName[0]}`;
                      
                      const cyclesCount = record.punches.length > 0 
                        ? Math.floor(record.punches.filter(p => p.punchType === "IN").length)
                        : 0;

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
                            {cyclesCount > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-zinc-900">
                                  {cyclesCount} work cycle{cyclesCount === 1 ? "" : "s"} completed
                                </span>
                                <span className="text-[10px] text-zinc-400 font-semibold">
                                  Clock Times: {formatTime(firstPunch?.punchedAt ?? record.checkIn)} — {formatTime(lastPunch?.punchedAt ?? record.checkOut)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-zinc-900">
                            {formatHours(record.totalHours)}
                          </td>
                          <td className="px-6 py-4">
                            {record.status === "PRESENT" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Present
                              </span>
                            ) : record.status === "INCOMPLETE" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/60 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Incomplete
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-1 text-[10px] font-bold text-zinc-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
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
