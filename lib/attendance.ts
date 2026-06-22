import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay, startOfWeek, endOfWeek } from "date-fns";

function dateOnly(value: Date) {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
}

export async function getAttendanceOverview(managedCompany?: string) {
  const today = new Date();
  const dayStart = dateOnly(startOfDay(today));
  const dayEnd = dateOnly(endOfDay(today));
  const weekStart = dateOnly(startOfWeek(today, { weekStartsOn: 1 }));
  const weekEnd = dateOnly(endOfWeek(today, { weekStartsOn: 1 }));

  const companyFilter = managedCompany ? { employee: { deployedCompany: managedCompany } } : {};

  const [weeklyRecords, aggregate] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        workDate: {
          gte: weekStart,
          lte: weekEnd,
        },
        ...companyFilter,
      },
      include: {
        employee: true,
        punches: {
          orderBy: { punchedAt: "asc" },
        },
      },
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.attendanceRecord.aggregate({
      where: {
        workDate: {
          gte: weekStart,
          lte: weekEnd,
        },
        totalHours: { not: null },
        ...companyFilter,
      },
      _avg: {
        totalHours: true,
      },
    }),
  ]);

  const todayPresent = await prisma.attendanceRecord.count({
    where: {
      workDate: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: "PRESENT",
      ...companyFilter,
    },
  });

  const pendingCheckOut = await prisma.attendanceRecord.count({
    where: {
      workDate: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: "INCOMPLETE",
      ...companyFilter,
    },
  });

  return {
    weeklyRecords,
    todayPresent,
    pendingCheckOut,
    avgWeekHours: aggregate._avg.totalHours ?? 0,
    weekStart,
    weekEnd,
  };
}
