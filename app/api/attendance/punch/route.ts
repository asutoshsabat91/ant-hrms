import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employee = await prisma.employee.findFirst({ where: { userId: session.user.id } });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const { punchType, latitude, longitude } = await req.json();
  if (!["IN", "OUT"].includes(punchType)) {
    return NextResponse.json({ error: "Invalid punch type" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let record = await prisma.attendanceRecord.findUnique({
    where: { employeeId_workDate: { employeeId: employee.id, workDate: today } },
    include: { punches: { orderBy: { punchedAt: "asc" } } },
  });

  if (!record) {
    record = await prisma.attendanceRecord.create({
      data: {
        employeeId: employee.id,
        workDate: today,
        status: "PRESENT",
        checkIn: punchType === "IN" ? new Date() : undefined,
      },
      include: { punches: { orderBy: { punchedAt: "asc" } } },
    });
  } else if (punchType === "IN" && !record.checkIn) {
    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { checkIn: new Date() },
    });
  } else if (punchType === "OUT") {
    const checkOut = new Date();
    const totalHours = record.checkIn
      ? (checkOut.getTime() - record.checkIn.getTime()) / 3600000
      : undefined;
    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { checkOut, totalHours },
    });
  }

  const locationStr = latitude && longitude ? `${latitude.toFixed(5)},${longitude.toFixed(5)}` : null;
  const now = new Date();

  // ── Missed punch-in detection ──────────────────────────────────────────────
  // If punching OUT but no prior IN punch exists today, auto-create an assumed punch-in at 9 AM IST
  if (punchType === "OUT") {
    const hasPunchIn = record.punches.some((p) => p.punchType === "IN");
    if (!hasPunchIn) {
      // 9:00 AM IST = 03:30 UTC
      const assumedIn = new Date(today);
      assumedIn.setUTCHours(3, 30, 0, 0);
      // Only assume if assumed time is before now
      if (assumedIn < now) {
        await prisma.attendancePunch.create({
          data: {
            attendanceId: record.id,
            employeeId: employee.id,
            punchType: "IN",
            punchedAt: assumedIn,
            isAssumed: true,
            assumedReason: "AUTO: No punch-in found. Defaulted to 9:00 AM.",
          },
        });
        // Notify the employee
        await prisma.notification.create({
          data: {
            userId: session.user.id,
            type: "ATTENDANCE_ALERT",
            title: "Punch-in assumed",
            body: "We couldn't find your punch-in today. Your start time has been set to 9:00 AM. Contact HR if incorrect.",
            link: "/attendance",
          },
        });
      }
    }
  }

  const punch = await prisma.attendancePunch.create({
    data: {
      attendanceId: record.id,
      employeeId: employee.id,
      punchType,
      punchedAt: now,
      location: locationStr,
    },
  });

  return NextResponse.json({ punch });
}
