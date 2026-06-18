import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format, subDays } from "date-fns";

function getPreviousWorkday() {
  const d = subDays(new Date(), 1);
  // If yesterday was Sunday (0) go to Friday, Saturday (6) go to Friday
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() - 2);
  if (day === 6) d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sumWorkedHours(punches: { punchType: string; punchedAt: Date }[]) {
  let total = 0;
  for (let i = 0; i < punches.length - 1; i++) {
    if (punches[i].punchType === "IN" && punches[i + 1].punchType === "OUT") {
      total += (punches[i + 1].punchedAt.getTime() - punches[i].punchedAt.getTime()) / 3600000;
      i++;
    }
  }
  return total;
}

export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = getPreviousWorkday();

  const incompleteRecords = await prisma.attendanceRecord.findMany({
    where: {
      workDate: yesterday,
      status: { notIn: ["HOLIDAY", "ON_LEAVE"] },
    },
    include: {
      punches: { orderBy: { punchedAt: "asc" } },
      employee: { include: { user: true } },
    },
  });

  let fixed = 0;

  for (const record of incompleteRecords) {
    const punches = record.punches;
    const lastPunch = punches.at(-1);

    // Only fix records where last punch was IN (punch-out missing)
    if (!lastPunch || lastPunch.punchType !== "IN") continue;

    // Assume 6:00 PM IST = 12:30 UTC
    const assumedOut = new Date(yesterday);
    assumedOut.setUTCHours(12, 30, 0, 0);

    const effectiveOut = assumedOut > lastPunch.punchedAt
      ? assumedOut
      : new Date(lastPunch.punchedAt.getTime() + 30 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.attendancePunch.create({
        data: {
          attendanceId: record.id,
          employeeId: record.employeeId,
          punchType: "OUT",
          punchedAt: effectiveOut,
          isAssumed: true,
          assumedReason: "AUTO: No punch-out found. Defaulted to 6:00 PM.",
        },
      });

      const allPunches = await tx.attendancePunch.findMany({
        where: { attendanceId: record.id },
        orderBy: { punchedAt: "asc" },
      });
      const totalHours = sumWorkedHours(allPunches);

      await tx.attendanceRecord.update({
        where: { id: record.id },
        data: {
          status: totalHours >= 4 ? "PRESENT" : "HALF_DAY",
          totalHours,
          checkOut: effectiveOut,
        },
      });
    });

    // Notify employee
    if (record.employee.user?.id) {
      await prisma.notification.create({
        data: {
          userId: record.employee.userId,
          type: "ATTENDANCE_ALERT",
          title: "Punch-out assumed for yesterday",
          body: `You forgot to punch out on ${format(yesterday, "dd MMM")}. Your end time was set to 6:00 PM. Contact HR if incorrect.`,
          link: "/attendance",
        },
      });
    }

    fixed++;
  }

  return NextResponse.json({ fixed, date: format(yesterday, "yyyy-MM-dd") });
}
