import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { createGoogleCalendarEvent, fetchGoogleCalendarEvents, fetchPersonalCalendarEvents } from "@/lib/googleCalendar";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["COMPANY_EVENT", "HOLIDAY", "TRAINING"]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  allDay: z.boolean().optional(),
});

// Emails that can see ALL team leaves
const ALL_LEAVES_EMAILS = [
  "rohit@theantbox.com",
  "priyanshu.shekhar@theantbox.com",
  "hive@theantbox.com",
  "chandrita@theantbox.com",
];

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const userEmail = session.user.email?.toLowerCase() ?? "";
    const userRole = session.user.role;

    // Determine leave visibility scope
    const canSeeAllLeaves = userRole === "ADMIN" && ALL_LEAVES_EMAILS.includes(userEmail);
    const isQapitaAdmin = userEmail === "sukhman@theantbox.com" && userRole === "COMPANY_ADMIN";

    // Fetch the current user's employee record to get their own employee ID
    const currentEmployee = await prisma.employee.findFirst({
      where: { user: { email: userEmail } },
      select: { id: true },
    });

    // Build leave query based on role
    let leaveWhere: Record<string, unknown> = {
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
    };

    if (!canSeeAllLeaves) {
      if (isQapitaAdmin) {
        // Sukhman sees only Qapita employees' leaves
        leaveWhere = { ...leaveWhere, employee: { deployedCompany: "Qapita" } };
      } else if (currentEmployee) {
        // All others see only their own approved leaves
        leaveWhere = { ...leaveWhere, employeeId: currentEmployee.id };
      } else {
        // No employee record → no leaves
        leaveWhere = { ...leaveWhere, id: "NONE" };
      }
    }

    const [holidays, companyEvents, approvedLeaves, employees, googleCalendarEvents] = await Promise.all([
      prisma.holiday.findMany({ where: { date: { gte: start, lte: end } } }),
      prisma.companyEvent.findMany({ where: { startDate: { lte: end }, endDate: { gte: start } } }),
      prisma.leaveRequest.findMany({
        where: leaveWhere,
        include: { employee: true, leaveType: true },
      }),
      prisma.employee.findMany({
        where: { status: { in: ["ACTIVE", "ONBOARDING"] }, dateOfBirth: { not: null } },
        select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
      }),
      fetchGoogleCalendarEvents(start, end),
    ]);

    // Personal Google Calendar events for the current user (if they've connected)
    let personalCalendarEvents: Awaited<ReturnType<typeof fetchPersonalCalendarEvents>> = [];
    if (currentEmployee) {
      const empWithToken = await prisma.employee.findUnique({
        where: { id: currentEmployee.id },
        select: { googleRefreshToken: true },
      });
      if (empWithToken?.googleRefreshToken) {
        personalCalendarEvents = await fetchPersonalCalendarEvents(
          empWithToken.googleRefreshToken,
          start,
          end
        );
      }
    }

    const birthdayEvents = employees.flatMap((employee) => {
      if (!employee.dateOfBirth) return [];
      const birthDate = new Date(employee.dateOfBirth);
      return [
        new Date(start.getFullYear(), birthDate.getMonth(), birthDate.getDate()),
        new Date(start.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate()),
      ]
        .filter((date) => date >= start && date <= end)
        .map((date) => ({
          id: `birthday-${employee.id}-${date.toISOString()}`,
          title: `${employee.firstName} ${employee.lastName}'s birthday`,
          start: date,
          end: date,
          allDay: true,
          category: "BIRTHDAY",
        }));
    });

    const events = [
      ...holidays.map((h) => ({ id: h.id, title: h.name, start: h.date, end: h.date, allDay: true, category: "HOLIDAY" })),
      ...companyEvents.map((e) => ({ id: e.id, title: e.title, start: e.startDate, end: e.endDate, allDay: e.allDay, category: e.category })),
      ...approvedLeaves.map((l) => ({
        id: l.id,
        title: canSeeAllLeaves || isQapitaAdmin
          ? `${l.employee.firstName} ${l.employee.lastName} — ${l.leaveType.name}`
          : l.leaveType.name, // For own leaves, just show leave type name
        start: l.startDate,
        end: l.endDate,
        allDay: true,
        category: "LEAVE",
      })),
      ...birthdayEvents,
      ...googleCalendarEvents,
      ...personalCalendarEvents,
    ];

    return NextResponse.json({ events });
  } catch (e) {
    console.error("[CALENDAR GET]", e);
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { title, description, category, startDate, endDate, allDay = true } = parsed.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: "Invalid event dates." }, { status: 400 });
    }

    const event = await prisma.companyEvent.create({
      data: { title, description, category, startDate: start, endDate: end, allDay, createdBy: session.user.id },
    });

    // Sync to Google Calendar
    await createGoogleCalendarEvent({
      title,
      description,
      startDate: start,
      endDate: end,
      allDay,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    console.error("[CALENDAR POST]", e);
    return NextResponse.json({ error: "Failed to create calendar event" }, { status: 500 });
  }
}
