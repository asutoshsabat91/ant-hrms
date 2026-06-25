import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PunchType } from "@prisma/client";

function getKolkataWorkDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
}

function sumWorkedHours(punches: { punchType: PunchType; punchedAt: Date }[]) {
  let totalMs = 0;
  let openIn: Date | null = null;

  for (const punch of punches) {
    if (punch.punchType === PunchType.IN) {
      openIn = punch.punchedAt;
    } else if (openIn) {
      totalMs += punch.punchedAt.getTime() - openIn.getTime();
      openIn = null;
    }
  }

  return Math.round((totalMs / 3600000) * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Super Admin only." }, { status: 403 });
    }

    const { csv } = await req.json();
    if (!csv || typeof csv !== "string") {
      return NextResponse.json({ error: "Missing or invalid csv content." }, { status: 400 });
    }

    const lines = csv.split(/\r?\n/);
    let headers: string[] = [];

    // Fetch all AntBox employees
    const antboxEmployees = await prisma.employee.findMany({
      where: { deployedCompany: "AntBox" },
      select: { id: true, employeeId: true },
    });
    const employeeMap = new Map(antboxEmployees.map((e) => [e.employeeId.toLowerCase().trim(), e.id]));

    let importedCount = 0;
    let duplicateCount = 0;
    let nonAntboxCount = 0;
    let invalidCount = 0;

    // Group rows by employeeId + workDate string so we can process them atomically and update records once
    const groups: Record<
      string,
      { employeeDbId: string; workDate: Date; punches: { punchedAt: Date; punchType: PunchType }[] }
    > = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());

      // Parse header
      if (i === 0 && (line.toLowerCase().includes("employeeid") || line.toLowerCase().includes("punchedat"))) {
        headers = cols.map((c) => c.toLowerCase());
        continue;
      }

      let empId = "";
      let dateStr = "";
      let typeStr = "";

      if (headers.length > 0) {
        const empIdx = headers.indexOf("employeeid");
        const dateIdx = headers.indexOf("punchedat");
        const typeIdx = headers.indexOf("punchtype");
        if (empIdx !== -1) empId = cols[empIdx] || "";
        if (dateIdx !== -1) dateStr = cols[dateIdx] || "";
        if (typeIdx !== -1) typeStr = cols[typeIdx] || "";
      } else {
        empId = cols[0] || "";
        dateStr = cols[1] || "";
        typeStr = cols[2] || "";
      }

      if (!empId || !dateStr || !typeStr) {
        invalidCount++;
        continue;
      }

      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        invalidCount++;
        continue;
      }

      const upperType = typeStr.toUpperCase();
      if (upperType !== "IN" && upperType !== "OUT") {
        invalidCount++;
        continue;
      }

      const employeeDbId = employeeMap.get(empId.toLowerCase().trim());
      if (!employeeDbId) {
        nonAntboxCount++;
        continue;
      }

      const workDate = getKolkataWorkDate(parsedDate);
      const groupKey = `${employeeDbId}_${workDate.getTime()}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          employeeDbId,
          workDate,
          punches: [],
        };
      }

      groups[groupKey].punches.push({
        punchedAt: parsedDate,
        punchType: upperType as PunchType,
      });
    }

    // Now process groups
    for (const groupKey in groups) {
      const { employeeDbId, workDate, punches } = groups[groupKey];

      await prisma.$transaction(async (tx) => {
        // Find or create AttendanceRecord
        const record = await tx.attendanceRecord.upsert({
          where: {
            employeeId_workDate: {
              employeeId: employeeDbId,
              workDate,
            },
          },
          create: {
            employeeId: employeeDbId,
            workDate,
            status: "PRESENT",
          },
          update: {},
        });

        // Fetch existing punches for this record to prevent duplicates
        const existingPunches = await tx.attendancePunch.findMany({
          where: {
            attendanceId: record.id,
          },
        });

        const newPunchesToCreate = [];
        for (const p of punches) {
          // Check if punch at this exact time already exists
          const exists = existingPunches.some((ep) => ep.punchedAt.getTime() === p.punchedAt.getTime());
          if (exists) {
            duplicateCount++;
          } else {
            newPunchesToCreate.push(p);
          }
        }

        if (newPunchesToCreate.length > 0) {
          await tx.attendancePunch.createMany({
            data: newPunchesToCreate.map((p) => ({
              attendanceId: record.id,
              employeeId: employeeDbId,
              punchType: p.punchType,
              punchedAt: p.punchedAt,
              device: "Biometric Import",
            })),
          });
          importedCount += newPunchesToCreate.length;
        }

        // Fetch all punches now to update the record summary
        const allPunches = await tx.attendancePunch.findMany({
          where: { attendanceId: record.id },
          orderBy: { punchedAt: "asc" },
        });

        if (allPunches.length > 0) {
          const totalHours = sumWorkedHours(allPunches);
          const firstIn = allPunches.find((item) => item.punchType === PunchType.IN);
          const lastOut = [...allPunches].reverse().find((item) => item.punchType === PunchType.OUT);
          const isIncomplete = allPunches.at(-1)?.punchType === PunchType.IN;

          await tx.attendanceRecord.update({
            where: { id: record.id },
            data: {
              checkIn: firstIn?.punchedAt ?? null,
              checkOut: isIncomplete ? null : lastOut?.punchedAt ?? null,
              totalHours,
              status: isIncomplete ? "INCOMPLETE" : "PRESENT",
            },
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      importedCount,
      duplicateCount,
      nonAntboxCount,
      invalidCount,
    });
  } catch (e: unknown) {
    console.error("[ATTENDANCE_IMPORT]", e);
    return NextResponse.json({ error: "Failed to import attendance data." }, { status: 500 });
  }
}
