import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { differenceInCalendarDays } from "date-fns";

const requestSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(5),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  if (!user?.employee) {
    return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
  }

  const currentYear = new Date().getFullYear();

  const [leaveTypes, leaveBalances, myRequests] = await Promise.all([
    prisma.leaveType.findMany({ orderBy: { name: "asc" } }),
    prisma.leaveBalance.findMany({
      where: { employeeId: user.employee.id, year: currentYear },
      include: { leaveType: true },
      orderBy: { leaveType: { name: "asc" } },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: user.employee.id },
      include: {
        leaveType: true,
        employee: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  let approvalRequests: Awaited<ReturnType<typeof prisma.leaveRequest.findMany>> = [];
  if (session.user.role === "SUPER_ADMIN" || session.user.role === "HR_ADMIN") {
    approvalRequests = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: {
        leaveType: true,
        employee: true,
      },
      orderBy: { createdAt: "desc" },
      take: 16,
    });
  } else if (session.user.role === "MANAGER") {
    approvalRequests = await prisma.leaveRequest.findMany({
      where: {
        status: "PENDING",
        employee: { managerId: user.employee.id },
      },
      include: {
        leaveType: true,
        employee: true,
      },
      orderBy: { createdAt: "desc" },
      take: 16,
    });
  }

  return NextResponse.json({
    leaveTypes,
    leaveBalances,
    myRequests,
    approvalRequests,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  if (!user?.employee) {
    return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
  }

  const employee = user.employee;
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { leaveTypeId, startDate, endDate, reason } = parsed.data;
  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType) {
    return NextResponse.json({ error: "Leave type not found." }, { status: 404 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  if (end < start) {
    return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
  }

  const days = differenceInCalendarDays(end, start) + 1;
  if (days <= 0) {
    return NextResponse.json({ error: "Leave must be at least one day." }, { status: 400 });
  }

  const existingOverlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: user.employee.id,
      status: { in: ["PENDING", "APPROVED"] },
      AND: [
        { startDate: { lte: end } },
        { endDate: { gte: start } },
      ],
    },
  });

  if (existingOverlap) {
    return NextResponse.json({ error: "You already have a leave request covering this period." }, { status: 400 });
  }

  const year = start.getFullYear();

  const result = await prisma.$transaction(async (tx) => {
    await tx.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: employee.id,
          leaveTypeId,
          year,
        },
      },
      create: {
        employeeId: employee.id,
        leaveTypeId,
        year,
        allocated: 0,
        used: 0,
        pending: days,
        carryover: 0,
      },
      update: {
        pending: { increment: days },
      },
    });

    const leaveRequest = await tx.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId,
        startDate: start,
        endDate: end,
        days,
        reason,
        status: "PENDING",
      },
      include: { leaveType: true },
    });

    const notificationMessage = `${employee.firstName} ${employee.lastName} requested ${days} day${days === 1 ? "" : "s"} of ${leaveType.name} leave from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`;
    const recipients = [] as { userId: string; title: string; body: string; link: string }[];

    if (employee.managerId) {
      const manager = await tx.employee.findUnique({
        where: { id: employee.managerId },
        include: { user: true },
      });
      if (manager?.user) {
        recipients.push({
          userId: manager.user.id,
          title: "Leave request pending approval",
          body: notificationMessage,
          link: "/leave",
        });
      }
    }

    const hrUsers = await tx.user.findMany({
      where: { role: { in: ["HR_ADMIN", "SUPER_ADMIN"] } },
    });

    hrUsers.forEach((hr) => {
      if (!recipients.some((recipient) => recipient.userId === hr.id)) {
        recipients.push({
          userId: hr.id,
          title: "Leave request submitted",
          body: notificationMessage,
          link: "/leave",
        });
      }
    });

    if (recipients.length > 0) {
      await tx.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.userId,
          type: "LEAVE_REQUEST",
          title: recipient.title,
          body: recipient.body,
          link: recipient.link,
        })),
      });
    }

    return leaveRequest;
  });

  return NextResponse.json({ request: result }, { status: 201 });
}
