import { Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { HeadcountTrendChart } from "@/components/dashboard/HeadcountTrendChart";
import { AttendancePulseChart } from "@/components/dashboard/AttendancePulseChart";
import { JoiningSoonWidget } from "@/components/dashboard/JoiningSoonWidget";
import { AttendanceCard } from "@/components/dashboard/AttendanceCard";
import { LeaveBalancesCard } from "@/components/dashboard/LeaveBalancesCard";
import { CompanyCalendarWidget } from "@/components/dashboard/CompanyCalendarWidget";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { TribeRadarWidget } from "@/components/dashboard/TribeRadarWidget";
import { ScrollIndicator } from "@/components/dashboard/ScrollIndicator";
import { getDashboardStats, getRecentActivity } from "@/lib/dashboard";

import type { Employee } from "@prisma/client";
import type { ActivityItem } from "@/components/dashboard/ActivityFeed";

export default async function DashboardPage() {
  const session = await auth();

  let stats = {
    activeCount: 0,
    onLeaveToday: 0,
    presentToday: 0,
    openGrievances: 0,
    presentPct: 0,
    leavePct: 0,
  };
  let activity: ActivityItem[] = [];
  let onboardingHires: Employee[] = [];
  let todayPunches: { id: string; punchType: "IN" | "OUT"; punchedAt: string; location?: string | null }[] = [];
  let leaveBalances: { leaveType: { name: string; code: string }; allocated: number; used: number; pending: number }[] = [];
  let holidays: { date: string; name: string }[] = [];
  const calendarLeaves: { date: string; type: string; label: string }[] = [];
  let leaveTypes: { id: string; name: string; code: string }[] = [];

  try {
    [stats, activity, onboardingHires] = await Promise.all([
      getDashboardStats(),
      getRecentActivity(),
      prisma.employee.findMany({
        where: { status: "ONBOARDING" },
        orderBy: { createdAt: "desc" },
        take: 4,
      }) as Promise<Employee[]>,
    ]);

    if (session?.user) {
      const employee = await prisma.employee.findFirst({ where: { userId: session.user.id } });

      if (employee) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [attendanceRecord, balances, holidayData, leaveTypeData, recentLeaves] = await Promise.all([
          prisma.attendanceRecord.findUnique({
            where: { employeeId_workDate: { employeeId: employee.id, workDate: today } },
            include: { punches: { orderBy: { punchedAt: "asc" } } },
          }),
          prisma.leaveBalance.findMany({
            where: { employeeId: employee.id, year: new Date().getFullYear() },
            include: { leaveType: { select: { name: true, code: true } } },
          }),
          prisma.holiday.findMany({
            where: {
              date: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1) },
            },
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

        todayPunches = (attendanceRecord?.punches ?? []).map((p) => ({
          id: p.id,
          punchType: p.punchType as "IN" | "OUT",
          punchedAt: p.punchedAt.toISOString(),
          location: p.location,
        }));

        leaveBalances = balances.map((b) => ({
          leaveType: b.leaveType,
          allocated: b.allocated,
          used: b.used,
          pending: b.pending,
        }));

        holidays = holidayData.map((h) => ({
          date: h.date.toISOString(),
          name: h.name,
        }));

        leaveTypes = leaveTypeData;

        // Expand multi-day leaves into individual days
        for (const lr of recentLeaves) {
          const start = new Date(lr.startDate);
          const end = new Date(lr.endDate);
          const cur = new Date(start);
          while (cur <= end) {
            calendarLeaves.push({
              date: cur.toISOString(),
              type: lr.leaveType.code,
              label: lr.leaveType.name,
            });
            cur.setDate(cur.getDate() + 1);
          }
        }
      }
    }
  } catch {
    // DB not connected fallback
  }

  const displayActiveCount = stats.activeCount || 312;
  const displayPresentToday = stats.presentToday || 287;
  const displayPresentPct = stats.presentPct || 94.6;

  const todayStr = format(new Date(), "dd MMM yyyy").toUpperCase();
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "HR_ADMIN";

  return (
    <div className="space-y-6">
      {/* Title Area */}
      <ScrollReveal className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            TODAY · {todayStr}
          </p>
          <h2 className="text-3xl font-extrabold text-zinc-950 mt-1">
            Your <span className="italic-serif text-4xl font-light text-[var(--purple)]">people</span>
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            A live look at headcount, attendance, sprint pipeline and operations across AntBox.
          </p>
        </div>

        {isAdmin && (
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
        )}
      </ScrollReveal>

      {/* Employee widgets row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ScrollReveal delayClass="reveal-delay-1">
          <AttendanceCard initialPunches={todayPunches} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-2">
          <LeaveBalancesCard balances={leaveBalances} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-3">
          <CompanyCalendarWidget
            holidays={holidays}
            leaves={calendarLeaves}
            leaveTypes={leaveTypes}
          />
        </ScrollReveal>
      </div>

      {/* Admin Stat Cards */}
      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScrollReveal delayClass="reveal-delay-1">
            <StatCard label="Headcount" value={displayActiveCount} subtext="+18 this quarter" />
          </ScrollReveal>
          <ScrollReveal delayClass="reveal-delay-2">
            <StatCard
              label="Today's Attendance"
              value={`${displayPresentPct}%`}
              subtext={`${displayPresentToday} of ${displayActiveCount} present`}
            />
          </ScrollReveal>
          <ScrollReveal delayClass="reveal-delay-3">
            <StatCard label="Active Sprints" value="12" subtext="3 closing this week" />
          </ScrollReveal>
          <ScrollReveal delayClass="reveal-delay-4">
            <StatCard label="Avg Readiness" value="87/100" subtext="+4 vs last quarter" />
          </ScrollReveal>
        </div>
      )}

      {/* Charts Grid (admin) */}
      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-3">
          <ScrollReveal delayClass="reveal-delay-1" className="lg:col-span-2">
            <HeadcountTrendChart activeCount={displayActiveCount} />
          </ScrollReveal>
          <ScrollReveal delayClass="reveal-delay-2">
            <TribeRadarWidget />
          </ScrollReveal>
        </div>
      )}

      {/* Onboarding, Attendance Pulse, Feed Grid */}
      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-3">
          <ScrollReveal delayClass="reveal-delay-1">
            <JoiningSoonWidget hires={onboardingHires} />
          </ScrollReveal>
          <ScrollReveal delayClass="reveal-delay-2">
            <AttendancePulseChart />
          </ScrollReveal>
          <ScrollReveal delayClass="reveal-delay-3">
            <ActivityFeed items={activity} />
          </ScrollReveal>
        </div>
      )}

      {/* Quick Actions */}
      <ScrollReveal delayClass="reveal-delay-4" className="pt-2">
        <QuickActions isAdmin={isAdmin} />
      </ScrollReveal>

      {/* Scroll Down Arrow Indicator */}
      <ScrollIndicator />
    </div>
  );
}
