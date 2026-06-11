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
  });

  if (!record) {
    record = await prisma.attendanceRecord.create({
      data: {
        employeeId: employee.id,
        workDate: today,
        status: "PRESENT",
        checkIn: punchType === "IN" ? new Date() : undefined,
      },
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

  const punch = await prisma.attendancePunch.create({
    data: {
      attendanceId: record.id,
      employeeId: employee.id,
      punchType,
      punchedAt: new Date(),
      location: locationStr,
    },
  });

  return NextResponse.json({ punch });
}
