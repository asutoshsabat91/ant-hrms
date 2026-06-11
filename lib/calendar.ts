import { addDays, endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function getCalendarOverview() {
  const today = startOfDay(new Date());
  const horizon = endOfDay(addDays(today, 30));

  const upcomingHolidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: today,
        lte: horizon,
      },
    },
    orderBy: { date: "asc" },
  });

  const upcomingLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: horizon },
      endDate: { gte: today },
    },
    include: {
      employee: true,
      leaveType: true,
    },
    orderBy: { startDate: "asc" },
  });

  const employees = await prisma.employee.findMany({
    where: {
      status: {
        in: ["ACTIVE", "ONBOARDING"],
      },
      dateOfBirth: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
    },
  });

  const upcomingBirthdays = employees.flatMap((employee) => {
    if (!employee.dateOfBirth) return [];

    const birthday = new Date(employee.dateOfBirth);
    birthday.setFullYear(today.getFullYear());

    if (birthday < today) {
      birthday.setFullYear(today.getFullYear() + 1);
    }

    if (birthday <= horizon) {
      return [
        {
          employee,
          date: birthday,
        },
      ];
    }

    return [];
  });

  return {
    upcomingHolidays,
    upcomingLeaves,
    upcomingBirthdays,
    horizon,
  };
}
