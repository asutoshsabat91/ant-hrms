// Trigger build run after revert
import { Plus } from "lucide-react";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { HeadcountTrendChart } from "@/components/dashboard/HeadcountTrendChart";
import { AttendancePulseChart } from "@/components/dashboard/AttendancePulseChart";
import { JoiningSoonWidget } from "@/components/dashboard/JoiningSoonWidget";
import { DashboardAttendanceLogs } from "@/components/dashboard/DashboardAttendanceLogs";
import { LeaveBalancesCard } from "@/components/dashboard/LeaveBalancesCard";
import { CompanyCalendarWidget } from "@/components/dashboard/CompanyCalendarWidget";
import { UpcomingHolidaysWidget } from "@/components/dashboard/UpcomingHolidaysWidget";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { TribeRadarWidget } from "@/components/dashboard/TribeRadarWidget";
import { ScrollIndicator } from "@/components/dashboard/ScrollIndicator";
import { DeptHeadcountChart } from "@/components/dashboard/DeptHeadcountChart";
import { LeaveStatsChart } from "@/components/dashboard/LeaveStatsChart";
import { PayrollSummaryCard } from "@/components/dashboard/PayrollSummaryCard";
import { UpcomingOffboardingWidget } from "@/components/dashboard/UpcomingOffboardingWidget";
import { PendingLeavesWidget } from "@/components/dashboard/PendingLeavesWidget";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { MasterSheetsSyncWidget } from "@/components/dashboard/MasterSheetsSyncWidget";
import { LiveWorkspacePulse } from "@/components/dashboard/LiveWorkspacePulse";
import { getDashboardStats, getRecentActivity, getAttendancePulse } from "@/lib/dashboard";
import { getDynamicBalances } from "@/lib/leave";
import type { Employee } from "@prisma/client";
import type { ActivityItem } from "@/components/dashboard/ActivityFeed";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  // ── Shared data ─────────────────────────────────────────────
  let todayPunches: { id: string; punchType: "IN" | "OUT"; punchedAt: string; location?: string | null }[] = [];
  let leaveBalances: { leaveType: { name: string; code: string }; allocated: number; used: number; pending: number }[] = [];
  let holidays: { date: string; name: string }[] = [];
  const calendarLeaves: { date: string; type: string; label: string }[] = [];
  let leaveTypes: { id: string; name: string; code: string }[] = [];
  let employeeName = session?.user?.name ?? "there";

  try {
    if (session?.user) {
      const employee = await prisma.employee.findFirst({ where: { userId: session.user.id } });
      if (employee) {
        if (employee.firstName) employeeName = `${employee.firstName} ${employee.lastName}`;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [attendanceRecord, holidayData, leaveTypeData, recentLeaves] = await Promise.all([
          prisma.attendanceRecord.findUnique({
            where: { employeeId_workDate: { employeeId: employee.id, workDate: today } },
            include: { punches: { orderBy: { punchedAt: "asc" } } },
          }),
          prisma.holiday.findMany({
            where: { date: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1) } },
          }),
          prisma.leaveType.findMany({ select: { id: true, name: true, code: true } }),
          prisma.leaveRequest.findMany({
            where: {
              employeeId: employee.id,
              status: { in: ["APPROVED", "PENDING"] },
              startDate: { gte: new Date(new Date().getFullYear(), 0, 1) },
            },
            include: { leaveType: { select: { code: true, name: true } } },
          }),
        ]);

        const balances = await getDynamicBalances(employee.id, employee.employmentType, new Date().getFullYear());
        todayPunches = (attendanceRecord?.punches ?? []).map((p) => ({
          id: p.id,
          punchType: p.punchType as "IN" | "OUT",
          punchedAt: p.punchedAt.toISOString(),
          location: p.location,
        }));
        leaveBalances = balances.map((b) => ({ leaveType: b.leaveType, allocated: b.allocated, used: b.used, pending: b.pending }));
        holidays = holidayData.map((h) => ({ date: h.date.toISOString(), name: h.name }));
        leaveTypes = leaveTypeData;

        for (const lr of recentLeaves) {
          const start = new Date(lr.startDate);
          const end = new Date(lr.endDate);
          const cur = new Date(start);
          while (cur <= end) {
            calendarLeaves.push({ date: cur.toISOString(), type: lr.leaveType.code, label: lr.leaveType.name });
            cur.setDate(cur.getDate() + 1);
          }
        }
      }
    }
  } catch { /* DB not connected fallback */ }

  // ── Employee Dashboard ───────────────────────────────────────
  if (!isAdmin) {
    let recentPayslips: { month: number; year: number; netPay: number; payslipUrl?: string | null }[] = [];
    try {
      const emp = await prisma.employee.findFirst({ where: { userId: session?.user?.id } });
      if (emp) {
        const lines = await prisma.payrollLine.findMany({
          where: { employeeId: emp.id },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { run: { select: { month: true, year: true } } },
        });
        recentPayslips = lines.map((l) => ({
          month: l.run.month,
          year: l.run.year,
          netPay: l.netPay,
          payslipUrl: l.payslipUrl,
        }));
      }
    } catch { /* fallback */ }

    return (
      <EmployeeDashboard
        name={employeeName}
        todayPunches={todayPunches}
        leaveBalances={leaveBalances}
        holidays={holidays}
        calendarLeaves={calendarLeaves}
        leaveTypes={leaveTypes}
        recentPayslips={recentPayslips}
      />
    );
  }

  // ── Admin Dashboard ──────────────────────────────────────────
  let stats = { activeCount: 0, onLeaveToday: 0, presentToday: 0, presentPct: 0, leavePct: 0 };
  let activity: ActivityItem[] = [];
  let onboardingHires: Employee[] = [];
  let deptData: { name: string; headcount: number }[] = [];
  let leaveStats: { status: string; count: number }[] = [];
  let latestPayrollRun: { status: string; month: number; year: number; totalNet?: number | null } | null = null;
  let upcomingOffboarding: { id: string; firstName: string; lastName: string; lastWorkingDate: Date | null; designation: string }[] = [];
  let pendingLeaves: { id: string; employee: { firstName: string; lastName: string; employeeId: string }; leaveType: { name: string }; days: number }[] = [];
  let pendingLeaveCount = 0;
  let radarMetrics = { activeCandidates: 14, avgReadiness: 87.4, sprintsLive: 6, pposClaimed: 8 };
  let attendancePulseData: { name: string; attendance: number }[] = [];

  try {
    const [statsResult, activityResult, onboardingHiresResult, pulseData, onboardingTasks, totalHiresCount, activeDepts, activeInternsCount] = await Promise.all([
      getDashboardStats(),
      getRecentActivity(),
      prisma.employee.findMany({ where: { status: "ONBOARDING" }, orderBy: { createdAt: "desc" }, take: 4 }) as Promise<Employee[]>,
      getAttendancePulse(),
      prisma.onboardingTask.findMany({ select: { status: true } }),
      prisma.employee.count({ where: { status: "ONBOARDING" } }),
      prisma.department.count(),
      prisma.employee.count({ where: { employmentType: "INTERN", status: { in: ["ACTIVE", "ONBOARDING"] } } }),
    ]);

    stats = statsResult;
    activity = activityResult;
    onboardingHires = onboardingHiresResult;
    attendancePulseData = pulseData;

    const totalOnboardingTasks = onboardingTasks.length;
    const completedOnboardingTasks = onboardingTasks.filter((t) => t.status === "COMPLETED").length;
    const avgReadiness = totalOnboardingTasks > 0 ? (completedOnboardingTasks / totalOnboardingTasks) * 100 : 87.4;

    radarMetrics = {
      activeCandidates: totalHiresCount || 14,
      avgReadiness,
      sprintsLive: activeDepts || 6,
      pposClaimed: activeInternsCount || 8,
    };

    const [depts, leaveGrouped, payrollRun, offboarding, pendingLvReqs, pendingLvCount] = await Promise.all([
      prisma.department.findMany({
        include: { employees: { where: { status: { in: ["ACTIVE", "ONBOARDING"] } }, select: { id: true } } },
      }),
      prisma.leaveRequest.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.payrollRun.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.employee.findMany({
        where: { status: "OFFBOARDING", lastWorkingDate: { gte: new Date(), lte: addDays(new Date(), 30) } },
        select: { id: true, firstName: true, lastName: true, lastWorkingDate: true, designation: true },
        orderBy: { lastWorkingDate: "asc" },
        take: 5,
      }),
      prisma.leaveRequest.findMany({
        where: { status: "PENDING" },
        take: 4,
        orderBy: { createdAt: "asc" },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeId: true } },
          leaveType: { select: { name: true } },
        },
      }),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    ]);

    deptData = depts.map((d) => ({ name: d.code, headcount: d.employees.length })).filter((d) => d.headcount > 0);
    leaveStats = leaveGrouped.map((g) => ({ status: g.status, count: g._count.id }));
    latestPayrollRun = payrollRun ? { status: payrollRun.status, month: payrollRun.month, year: payrollRun.year } : null;
    upcomingOffboarding = offboarding;
    pendingLeaves = pendingLvReqs;
    pendingLeaveCount = pendingLvCount;
  } catch { /* fallback */ }

  const displayActiveCount = stats.activeCount || 0;
  const displayPresentToday = stats.presentToday || 0;
  const displayPresentPct = stats.presentPct || 0;
  const todayStr = format(new Date(), "dd MMM yyyy").toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">TODAY · {todayStr}</p>
          <h2 className="text-3xl font-extrabold text-zinc-950 mt-1">
            Your <span className="italic-serif text-4xl font-light text-[var(--purple)]">people</span>
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Live headcount, attendance, and operations across AntBox.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-2 md:mt-0">
          <a
            href="/api/reports/export"
            download="AntBox_Status_Report.csv"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 transition-all duration-300 hover:bg-zinc-50 hover:border-zinc-300 hover:-translate-y-0.5 shadow-sm"
          >
            Export report
          </a>
          <Link
            href="/employees?action=new"
            className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-zinc-800 hover:-translate-y-0.5 hover:shadow-md"
          >
            <Plus className="h-3.5 w-3.5" />
            Add employee
          </Link>
        </div>
      </ScrollReveal>

      {/* Employee widgets row (admin also sees punch-in) */}
      <div className="grid gap-4 lg:grid-cols-3 items-start">
        {isAdmin ? (
          <ScrollReveal delayClass="reveal-delay-1" className="lg:col-span-2">
            <LiveWorkspacePulse
              activeCount={displayActiveCount}
              presentPct={displayPresentPct}
              onLeaveCount={stats.onLeaveToday}
              pendingApprovals={pendingLeaveCount}
            />
          </ScrollReveal>
        ) : (
          <>
            <ScrollReveal delayClass="reveal-delay-1">
              <DashboardAttendanceLogs punches={todayPunches} />
            </ScrollReveal>
            <ScrollReveal delayClass="reveal-delay-2">
              <LeaveBalancesCard balances={leaveBalances} />
            </ScrollReveal>
          </>
        )}
        <ScrollReveal delayClass="reveal-delay-3" className="space-y-4">
          <CompanyCalendarWidget holidays={holidays} leaves={calendarLeaves} leaveTypes={leaveTypes} />
          <UpcomingHolidaysWidget holidays={holidays} />
        </ScrollReveal>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScrollReveal delayClass="reveal-delay-1">
          <StatCard label="Headcount" value={displayActiveCount} subtext="+18 this quarter" />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-2">
          <StatCard label="Today's Attendance" value={`${displayPresentPct}%`} subtext={`${displayPresentToday} of ${displayActiveCount} present`} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-3">
          <StatCard label="On Leave Today" value={stats.onLeaveToday} subtext={`${stats.leavePct}% of team`} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-4">
          <StatCard label="Pending Approvals" value={pendingLeaveCount} subtext="leave requests" />
        </ScrollReveal>
      </div>

      {/* Analytics Row 1: Dept chart, Leave donut, Payroll */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ScrollReveal delayClass="reveal-delay-1">
          <DeptHeadcountChart data={deptData} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-2">
          <LeaveStatsChart data={leaveStats} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-3">
          <PayrollSummaryCard run={latestPayrollRun} />
        </ScrollReveal>
      </div>

      {/* Analytics Row 2: Upcoming exits, Pending leaves, Reimbursements */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ScrollReveal delayClass="reveal-delay-1">
          <UpcomingOffboardingWidget employees={upcomingOffboarding} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-2">
          <PendingLeavesWidget leaves={pendingLeaves} count={pendingLeaveCount} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-3">
          <AttendancePulseChart data={attendancePulseData} />
        </ScrollReveal>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ScrollReveal delayClass="reveal-delay-1" className="lg:col-span-2">
          <HeadcountTrendChart activeCount={displayActiveCount} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-2">
          <TribeRadarWidget
            activeCandidates={radarMetrics.activeCandidates}
            avgReadiness={radarMetrics.avgReadiness}
            sprintsLive={radarMetrics.sprintsLive}
            pposClaimed={radarMetrics.pposClaimed}
          />
        </ScrollReveal>
      </div>

      {/* Master Employee Database (Google Sheets) */}
      <ScrollReveal delayClass="reveal-delay-3">
        <MasterSheetsSyncWidget spreadsheetId={process.env.GOOGLE_SPREADSHEET_ID} />
      </ScrollReveal>

      {/* Onboarding + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ScrollReveal delayClass="reveal-delay-1">
          <JoiningSoonWidget hires={onboardingHires} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-2">
          <ActivityFeed items={activity} />
        </ScrollReveal>
      </div>

      {/* Quick Actions */}
      <ScrollReveal delayClass="reveal-delay-4" className="pt-2">
        <QuickActions isAdmin={isAdmin} />
      </ScrollReveal>

      <ScrollIndicator />
    </div>
  );
}
