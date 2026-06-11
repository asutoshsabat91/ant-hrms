import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addDays, endOfDay, startOfDay } from "date-fns";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["COMPANY_EVENT", "HOLIDAY", "TRAINING"]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  allDay: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start")
    ? new Date(url.searchParams.get("start") as string)
    : startOfDay(new Date());
  const end = url.searchParams.get("end")
    ? new Date(url.searchParams.get("end") as string)
    : endOfDay(addDays(start, 30));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: start, lte: end },
    },
  });

  const companyEvents = await prisma.companyEvent.findMany({
    where: {
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
    },
    include: {
      employee: true,
      leaveType: true,
    },
  });

  const employees = await prisma.employee.findMany({
    where: {
      status: { in: ["ACTIVE", "ONBOARDING"] },
      dateOfBirth: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
    },
  });

  const birthdayEvents = employees.flatMap((employee) => {
    if (!employee.dateOfBirth) return [];

    const birthDate = new Date(employee.dateOfBirth);
    const eventDateThisYear = new Date(start.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    const eventDateNextYear = new Date(start.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
    const candidateDates = [eventDateThisYear, eventDateNextYear];

    return candidateDates
      .filter((date) => date >= start && date <= end)
      .map((date) => ({
        id: `birthday-${employee.id}-${date.toISOString()}`,
        title: `${employee.firstName} ${employee.lastName}’s birthday`,
        start: date,
        end: date,
        allDay: true,
        category: "BIRTHDAY",
      }));
  });

  const events = [
    ...holidays.map((holiday) => ({
      id: holiday.id,
      title: holiday.name,
      start: holiday.date,
      end: holiday.date,
      allDay: true,
      category: "HOLIDAY",
    })),
    ...companyEvents.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.startDate,
      end: event.endDate,
      allDay: event.allDay,
      category: event.category,
    })),
    ...approvedLeaves.map((leave) => ({
      id: leave.id,
      title: `${leave.employee.firstName} ${leave.employee.lastName} — ${leave.leaveType.name}`,
      start: leave.startDate,
      end: leave.endDate,
      allDay: true,
      category: "LEAVE",
    })),
    ...birthdayEvents,
  ];

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["HR_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, category, startDate, endDate, allDay = true } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return NextResponse.json({ error: "Invalid event dates." }, { status: 400 });
  }

  const event = await prisma.companyEvent.create({
    data: {
      title,
      description,
      category,
      startDate: start,
      endDate: end,
      allDay,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
