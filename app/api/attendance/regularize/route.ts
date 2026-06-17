import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");

  const isAdmin = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"].includes(session.user.role);

  try {
    let requests;
    if (isAdmin && !employeeId) {
      // Admin gets all pending requests
      requests = await prisma.regularizationRequest.findMany({
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Get requests for self or specific employee (if authorized)
      const emp = await prisma.employee.findFirst({
        where: { userId: session.user.id },
      });

      const targetEmpId = employeeId || emp?.id;
      if (!targetEmpId) {
        return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
      }

      if (!isAdmin && targetEmpId !== emp?.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      requests = await prisma.regularizationRequest.findMany({
        where: { employeeId: targetEmpId },
        orderBy: { date: "desc" },
      });
    }

    return NextResponse.json({ success: true, requests });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const emp = await prisma.employee.findFirst({
    where: { userId: session.user.id },
  });
  if (!emp) return NextResponse.json({ error: "Employee record not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { date, type, clockIn, clockOut, reason } = body;

    if (!date || !type || !reason?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedDate = new Date(date);

    // Check existing
    const existing = await prisma.regularizationRequest.findFirst({
      where: { employeeId: emp.id, date: parsedDate },
    });
    if (existing) {
      return NextResponse.json({ error: "A regularization request already exists for this date." }, { status: 400 });
    }

    let clockInDate = null;
    let clockOutDate = null;

    if (clockIn) {
      clockInDate = new Date(`${date}T${clockIn}:00`);
    }
    if (clockOut) {
      clockOutDate = new Date(`${date}T${clockOut}:00`);
    }

    const request = await prisma.regularizationRequest.create({
      data: {
        employeeId: emp.id,
        date: parsedDate,
        type,
        clockIn: clockInDate,
        clockOut: clockOutDate,
        reason,
        status: "PENDING",
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: { in: ["SUPER_ADMIN", "HR_ADMIN"] } } });
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "ATTENDANCE_REGULARIZATION" as const,
        title: "Attendance Regularization Request",
        body: `${emp.firstName} ${emp.lastName} requested regularization for ${date}.`,
        link: "/attendance",
      })),
    });

    return NextResponse.json({ success: true, request });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
