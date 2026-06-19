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

  const locationStr = latitude && longitude ? `${latitude.toFixed(5)},${longitude.toFixed(5)}` : null;
  const now = new Date();

  let punch;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock the employee row to serialize punch operations for this employee
      await tx.$executeRaw`SELECT * FROM "Employee" WHERE id = ${employee.id} FOR UPDATE`;

      // 2. Fetch today's record under lock
      let record = await tx.attendanceRecord.findUnique({
        where: { employeeId_workDate: { employeeId: employee.id, workDate: today } },
        include: { punches: { orderBy: { punchedAt: "asc" } } },
      });

      // 3. Prevent duplicate consecutive punches (punchType validation)
      const lastPunch = record?.punches.at(-1);
      const nextType = lastPunch?.punchType === "IN" ? "OUT" : "IN";
      if (punchType !== nextType) {
        throw new Error(`You have already punched ${lastPunch?.punchType || "OUT"}. Please alternate your punches.`);
      }

      // 4. Create or update record
      if (!record) {
        record = await tx.attendanceRecord.create({
          data: {
            employeeId: employee.id,
            workDate: today,
            status: "PRESENT",
            checkIn: punchType === "IN" ? now : undefined,
          },
          include: { punches: { orderBy: { punchedAt: "asc" } } },
        });
      } else if (punchType === "IN" && !record.checkIn) {
        record = await tx.attendanceRecord.update({
          where: { id: record.id },
          data: { checkIn: now },
          include: { punches: { orderBy: { punchedAt: "asc" } } },
        });
      } else if (punchType === "OUT") {
        const totalHours = record.checkIn
          ? (now.getTime() - record.checkIn.getTime()) / 3600000
          : undefined;
        record = await tx.attendanceRecord.update({
          where: { id: record.id },
          data: { checkOut: now, totalHours },
          include: { punches: { orderBy: { punchedAt: "asc" } } },
        });
      }

      // 5. Missed punch-in auto-creation
      if (punchType === "OUT") {
        const hasPunchIn = record.punches.some((p) => p.punchType === "IN");
        if (!hasPunchIn) {
          const assumedIn = new Date(today);
          assumedIn.setUTCHours(3, 30, 0, 0); // 9:00 AM IST
          if (assumedIn < now) {
            await tx.attendancePunch.create({
              data: {
                attendanceId: record.id,
                employeeId: employee.id,
                punchType: "IN",
                punchedAt: assumedIn,
                isAssumed: true,
                assumedReason: "AUTO: No punch-in found. Defaulted to 9:00 AM.",
              },
            });
            await tx.notification.create({
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

      // 6. Create the punch record
      const newPunch = await tx.attendancePunch.create({
        data: {
          attendanceId: record.id,
          employeeId: employee.id,
          punchType,
          punchedAt: now,
          location: locationStr,
        },
      });

      return newPunch;
    });
    punch = result;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "";
    if (errMsg.includes("already punched") || errMsg.includes("Please alternate")) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    console.error("[PUNCH ROUTE ERROR]", err);
    return NextResponse.json({ error: "Failed to record punch due to server conflict. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ punch });
}
