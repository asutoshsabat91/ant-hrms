import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import type { ActivityItem } from "@/components/dashboard/ActivityFeed";
import type { BirthdayEntry } from "@/components/dashboard/BirthdayWidget";

export async function getDashboardStats() {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const [activeCount, onLeaveToday, presentToday, openGrievances] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        startDate: { lte: dayEnd },
        endDate: { gte: dayStart },
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        workDate: { gte: dayStart, lte: dayEnd },
        status: "PRESENT",
      },
    }),
    prisma.grievance.count({
      where: { status: { in: ["OPEN", "UNDER_REVIEW", "ESCALATED"] } },
    }),
  ]);

  const total = activeCount + onLeaveToday || 1;
  const presentPct = Math.round((presentToday / total) * 1000) / 10;
  const leavePct = Math.round((onLeaveToday / total) * 1000) / 10;

  return {
    activeCount,
    onLeaveToday,
    presentToday,
    openGrievances,
    presentPct,
    leavePct,
  };
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const [hires, leaves, grievances] = await Promise.all([
    prisma.employee.findMany({
      where: { status: "ONBOARDING" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    }),
    prisma.leaveRequest.findMany({
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { employee: true, leaveType: true },
    }),
    prisma.grievance.findMany({
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { id: true, ticketNo: true, subject: true, createdAt: true },
    }),
  ]);

  const items: ActivityItem[] = [
    ...hires.map((h) => ({
      id: h.id,
      title: `${h.firstName} ${h.lastName} joined`,
      description: "New hire onboarding started",
      createdAt: h.createdAt,
      type: "hire" as const,
    })),
    ...leaves.map((l) => ({
      id: l.id,
      title: `Leave ${l.status.toLowerCase()}`,
      description: `${l.employee.firstName} — ${l.leaveType.name}`,
      createdAt: l.updatedAt,
      type: "leave" as const,
    })),
    ...grievances.map((g) => ({
      id: g.id,
      title: g.ticketNo,
      description: g.subject,
      createdAt: g.createdAt,
      type: "grievance" as const,
    })),
  ];

  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8);
}

export async function getWeekCelebrations(): Promise<BirthdayEntry[]> {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE", dateOfBirth: { not: null } },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, joiningDate: true },
  });

  const entries: BirthdayEntry[] = [];

  for (const emp of employees) {
    if (emp.dateOfBirth) {
      const bday = new Date(emp.dateOfBirth);
      bday.setFullYear(new Date().getFullYear());
      if (isWithinInterval(bday, { start: weekStart, end: weekEnd })) {
        entries.push({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          date: bday,
          type: "birthday",
        });
      }
    }
    const join = new Date(emp.joiningDate);
    const anniversary = new Date(join);
    anniversary.setFullYear(new Date().getFullYear());
    if (isWithinInterval(anniversary, { start: weekStart, end: weekEnd })) {
      const years = new Date().getFullYear() - join.getFullYear();
      if (years > 0) {
        entries.push({
          id: `${emp.id}-ann`,
          name: `${emp.firstName} ${emp.lastName}`,
          date: anniversary,
          type: "anniversary",
          years,
        });
      }
    }
  }

  return entries.slice(0, 5);
}
