import { NextResponse } from "next/server";
import { PunchType } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function apiResponse(
  success: boolean,
  data: Record<string, unknown> = {},
  message = "",
  errors: unknown[] = [],
  status = 200
) {
  return NextResponse.json({ success, data, message, errors }, { status });
}

function todayStart() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
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

function serialize(record: Awaited<ReturnType<typeof getTodayRecord>>) {
  if (!record) {
    return {
      record: null,
      punches: [],
      nextAction: "PUNCH_IN",
      totalHours: 0,
      isIncomplete: false,
    };
  }

  const lastPunch = record.punches.at(-1);
  return {
    record,
    punches: record.punches,
    nextAction: lastPunch?.punchType === PunchType.IN ? "PUNCH_OUT" : "PUNCH_IN",
    totalHours: record.totalHours ?? 0,
    isIncomplete: lastPunch?.punchType === PunchType.IN,
  };
}

async function getSessionEmployee() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
}

async function getTodayRecord(employeeId: string) {
  return prisma.attendanceRecord.findUnique({
    where: {
      employeeId_workDate: {
        employeeId,
        workDate: todayStart(),
      },
    },
    include: {
      punches: {
        orderBy: { punchedAt: "asc" },
      },
    },
  });
}

export async function GET() {
  const user = await getSessionEmployee();
  if (!user) {
    return apiResponse(false, {}, "Unauthorized", ["Unauthorized"], 401);
  }

  if (!user.employee) {
    return apiResponse(false, {}, "Employee record not found", ["Employee record not found"], 404);
  }

  const record = await getTodayRecord(user.employee.id);
  
  const today = todayStart();
  
  // Check for approved WFH leave for today
  const wfhLeave = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: user.employee.id,
      status: "APPROVED",
      leaveType: { code: "WFH" },
      startDate: { lte: today },
      endDate: { gte: today }
    }
  });
  
  // Check for approved remote regularization for today
  const remoteReg = await prisma.regularizationRequest.findFirst({
    where: {
      employeeId: user.employee.id,
      status: "APPROVED",
      type: "REMOTE",
      date: today
    }
  });

  const isWFH = !!wfhLeave || !!remoteReg || user.employee.workMode === "REMOTE";

  const data = {
    ...serialize(record),
    isWFH,
    workMode: user.employee.workMode,
  };

  return apiResponse(true, data, "Attendance loaded");
}

export async function POST(req: Request) {
  const user = await getSessionEmployee();
  if (!user) {
    return apiResponse(false, {}, "Unauthorized", ["Unauthorized"], 401);
  }

  if (!user.employee) {
    return apiResponse(false, {}, "Employee record not found", ["Employee record not found"], 404);
  }

  const body = await req.json().catch(() => ({}));
  const requestedAction = body?.action;
  const workDate = todayStart();
  const now = new Date();
  const location = typeof body?.location === "string" ? body.location.trim() : undefined;
  const device = typeof body?.device === "string" ? body.device.trim() : "Web";

  const result = await prisma.$transaction(async (tx) => {
    // Acquire a row-level lock on the Employee table to serialize concurrent punch attempts for this employee
    await tx.$executeRaw`SELECT * FROM "Employee" WHERE id = ${user.employee!.id} FOR UPDATE`;

    const record = await tx.attendanceRecord.upsert({
      where: {
        employeeId_workDate: {
          employeeId: user.employee!.id,
          workDate,
        },
      },
      create: {
        employeeId: user.employee!.id,
        workDate,
        status: "PRESENT",
      },
      update: {},
    });

    const punches = await tx.attendancePunch.findMany({
      where: {
        employeeId: user.employee!.id,
        punchedAt: {
          gte: startOfDay(now),
          lte: endOfDay(now),
        },
      },
      orderBy: { punchedAt: "asc" },
    });

    const lastPunch = punches.at(-1);
    const nextType = lastPunch?.punchType === PunchType.IN ? PunchType.OUT : PunchType.IN;

    if (requestedAction === "CHECKIN" && nextType === PunchType.OUT) {
      return {
        error: "Please punch out first before punching in again",
        status: 400,
      };
    }

    if (requestedAction === "CHECKOUT" && nextType === PunchType.IN) {
      return {
        error: "Please punch in before punching out",
        status: 400,
      };
    }

    const punch = await tx.attendancePunch.create({
      data: {
        attendanceId: record.id,
        employeeId: user.employee!.id,
        punchType: nextType,
        punchedAt: now,
        location,
        device,
      },
    });

    const updatedPunches = [...punches, punch];
    const totalHours = sumWorkedHours(updatedPunches);
    const firstIn = updatedPunches.find((item) => item.punchType === PunchType.IN);
    const lastOut = [...updatedPunches].reverse().find((item) => item.punchType === PunchType.OUT);
    const isIncomplete = updatedPunches.at(-1)?.punchType === PunchType.IN;

    const updatedRecord = await tx.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkIn: firstIn?.punchedAt ?? null,
        checkOut: isIncomplete ? null : lastOut?.punchedAt ?? null,
        totalHours,
        status: isIncomplete ? "INCOMPLETE" : "PRESENT",
      },
      include: {
        punches: {
          orderBy: { punchedAt: "asc" },
        },
      },
    });

    return {
      action: nextType === PunchType.IN ? "punch_in" : "punch_out",
      record: updatedRecord,
      punch,
      hoursThisSession:
        nextType === PunchType.OUT && lastPunch
          ? Math.round(((now.getTime() - lastPunch.punchedAt.getTime()) / 3600000) * 100) / 100
          : null,
      status: 201,
    };
  });

  if ("error" in result) {
    return apiResponse(false, {}, result.error, [result.error], result.status);
  }

  return apiResponse(
    true,
    {
      ...serialize(result.record),
      action: result.action,
      punch: result.punch,
      hoursThisSession: result.hoursThisSession,
    },
    result.action === "punch_in" ? "Punched in successfully" : "Punched out successfully",
    [],
    result.status
  );
}
