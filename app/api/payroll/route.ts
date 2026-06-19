import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calculatePayroll } from "@/lib/utils/payrollEngine";
import { differenceInCalendarDays, lastDayOfMonth, startOfMonth } from "date-fns";

const monthYearSchema = z.object({
  month: z.preprocess((value) => Number(value), z.number().int().min(1).max(12)).optional(),
  year: z.preprocess((value) => Number(value), z.number().int().min(2000)).optional(),
});

const createSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

function countWorkingDays(start: Date, end: Date) {
  const current = new Date(start);
  let count = 0;
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function overlapDays(start: Date, end: Date, periodStart: Date, periodEnd: Date) {
  const effectiveStart = start > periodStart ? start : periodStart;
  const effectiveEnd = end < periodEnd ? end : periodEnd;
  if (effectiveEnd < effectiveStart) return 0;
  return differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = monthYearSchema.safeParse({
    month: url.searchParams.get("month"),
    year: url.searchParams.get("year"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid month or year." }, { status: 400 });
  }

  const now = new Date();
  const month = parsed.data.month ?? now.getMonth() + 1;
  const year = parsed.data.year ?? now.getFullYear();
  const periodStart = startOfMonth(new Date(year, month - 1, 1));
  const periodEnd = lastDayOfMonth(periodStart);
  const workingDays = countWorkingDays(periodStart, periodEnd);

  const existingRun = await prisma.payrollRun.findUnique({
    where: { month_year: { month, year } },
    include: {
      lines: { include: { employee: true } },
    },
  });


  const employees = await prisma.employee.findMany({
    where: {
      status: { in: ["ACTIVE", "ONBOARDING"] },
      basicSalary: { not: null },
    },
    include: {
      leaveRequests: {
        where: {
          status: "APPROVED",
          startDate: { lte: periodEnd },
          endDate: { gte: periodStart },
        },
        include: { leaveType: true },
      },
      leaveBalances: {
        where: { year },
      },
    },
  });

  const payrollLines = employees.map((employee) => {
    const leaveDays = employee.leaveRequests.reduce((total, leave) => {
      if (leave.leaveType.code === "LOP") {
        return total + overlapDays(leave.startDate, leave.endDate, periodStart, periodEnd);
      }
      if (leave.leaveType.code === "SICK") {
        const overlap = overlapDays(leave.startDate, leave.endDate, periodStart, periodEnd);
        const sickLopRatio = leave.days > 0 ? (leave.sickLopDays / leave.days) : 0;
        return total + (overlap * sickLopRatio);
      }
      return total;
    }, 0);

    // Total approved leaves taken in the full year (sum of 'used' across all leave balance records)
    const totalLeavesTaken = employee.leaveBalances.reduce((sum, bal) => sum + (bal.used || 0), 0);

    const paidDays = Math.max(workingDays - leaveDays, 0);
    const payroll = calculatePayroll(
      {
        basicSalary: employee.basicSalary,
        hra: employee.hra,
        specialAllowance: employee.specialAllowance,
        professionalTax: employee.professionalTax,
        pan: employee.pan,
      },
      paidDays,
      workingDays
    );

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      designation: employee.designation,
      basicSalary: employee.basicSalary ?? 0,
      hra: employee.hra ?? 0,
      specialAllowance: employee.specialAllowance ?? 0,
      grossEarnings: payroll.grossEarnings,
      pf: payroll.pf,
      esi: payroll.esi,
      professionalTax: payroll.professionalTax,
      tds: payroll.tds,
      lop: payroll.lop,
      totalDeductions: payroll.totalDeductions,
      netPay: payroll.netPay,
      paidDays: payroll.paidDays,
      lopDays: payroll.lopDays,
      totalLeavesTaken,
    };
  });

  const totalGross = payrollLines.reduce((sum, line) => sum + line.grossEarnings, 0);
  const totalNet = payrollLines.reduce((sum, line) => sum + line.netPay, 0);

  return NextResponse.json({
    month,
    year,
    status: existingRun?.status ?? "DRAFT",
    hasRun: Boolean(existingRun),
    workingDays,
    totalEmployees: payrollLines.length,
    totalGross,
    totalNet,
    lines: existingRun
      ? existingRun.lines.map((line) => {
          const preview = payrollLines.find((pl) => pl.employeeId === line.employeeId);
          return {
            employeeId: line.employeeId,
            employeeName: `${line.employee.firstName} ${line.employee.lastName}`,
            designation: line.employee.designation,
            basicSalary: line.basicSalary,
            hra: line.hra,
            specialAllowance: line.specialAllowance,
            grossEarnings: line.grossEarnings,
            pf: line.pf,
            esi: line.esi,
            professionalTax: line.professionalTax,
            tds: line.tds,
            lop: line.lop,
            totalDeductions: line.totalDeductions,
            netPay: line.netPay,
            paidDays: line.paidDays,
            lopDays: line.lopDays,
            totalLeavesTaken: preview?.totalLeavesTaken ?? 0,
          };
        })
      : payrollLines,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { month, year } = parsed.data;
  const periodStart = startOfMonth(new Date(year, month - 1, 1));
  const periodEnd = lastDayOfMonth(periodStart);
  const workingDays = countWorkingDays(periodStart, periodEnd);

  const existingRun = await prisma.payrollRun.findUnique({
    where: { month_year: { month, year } },
  });

  if (existingRun) {
    return NextResponse.json({ error: "Payroll already exists for this period." }, { status: 409 });
  }

  const employees = await prisma.employee.findMany({
    where: {
      status: { in: ["ACTIVE", "ONBOARDING"] },
      basicSalary: { not: null },
    },
    include: {
      leaveRequests: {
        where: {
          status: "APPROVED",
          startDate: { lte: periodEnd },
          endDate: { gte: periodStart },
        },
        include: { leaveType: true },
      },
      attendanceRecords: {
        where: {
          workDate: { gte: periodStart, lte: periodEnd },
        },
        select: { workDate: true, status: true },
      },
    },
  });

  const lines = employees.map((employee) => {
    // LOP from attendance: days that are not PRESENT, ON_LEAVE, HOLIDAY, WFH, or HALF_DAY
    const attendedDays = new Set(
      employee.attendanceRecords
        .filter((r) => ["PRESENT", "ON_LEAVE", "HOLIDAY", "WFH", "HALF_DAY"].includes(r.status))
        .map((r) => r.workDate.toISOString().split("T")[0])
    );
    const attendanceLopDays = Math.max(workingDays - attendedDays.size, 0);

    // Fallback to leave-based LOP if no attendance data
    const leaveDays = employee.leaveRequests.reduce((total, leave) => {
      if (leave.leaveType.code === "LOP") {
        return total + overlapDays(leave.startDate, leave.endDate, periodStart, periodEnd);
      }
      if (leave.leaveType.code === "SICK") {
        const overlap = overlapDays(leave.startDate, leave.endDate, periodStart, periodEnd);
        const sickLopRatio = leave.days > 0 ? (leave.sickLopDays / leave.days) : 0;
        return total + (overlap * sickLopRatio);
      }
      return total;
    }, 0);
    const lopDaysResolved = employee.attendanceRecords.length > 0 ? attendanceLopDays : leaveDays;

    const paidDays = Math.max(workingDays - lopDaysResolved, 0);
    const payroll = calculatePayroll(
      {
        basicSalary: employee.basicSalary,
        hra: employee.hra,
        specialAllowance: employee.specialAllowance,
        professionalTax: employee.professionalTax,
        pan: employee.pan,
      },
      paidDays,
      workingDays
    );

    return {
      employeeId: employee.id,
      basicSalary: employee.basicSalary ?? 0,
      hra: employee.hra ?? 0,
      specialAllowance: employee.specialAllowance ?? 0,
      grossEarnings: payroll.grossEarnings,
      pf: payroll.pf,
      esi: payroll.esi,
      professionalTax: payroll.professionalTax,
      tds: payroll.tds,
      lop: payroll.lop,
      totalDeductions: payroll.totalDeductions,
      netPay: payroll.netPay,
      workingDays,
      paidDays: payroll.paidDays,
      lopDays: payroll.lopDays,
    };
  });

  const run = await prisma.payrollRun.create({
    data: {
      month,
      year,
      periodStart,
      periodEnd,
      status: "DRAFT",
      createdBy: session.user.id,
      lines: {
        create: lines.map((line) => ({
          employeeId: line.employeeId,
          basicSalary: line.basicSalary,
          hra: line.hra,
          specialAllowance: line.specialAllowance,
          overtimePay: 0,
          bonus: 0,
          grossEarnings: line.grossEarnings,
          pf: line.pf,
          esi: line.esi,
          professionalTax: line.professionalTax,
          tds: line.tds,
          lop: line.lop,
          totalDeductions: line.totalDeductions,
          netPay: line.netPay,
          workingDays: line.workingDays,
          paidDays: line.paidDays,
          lopDays: line.lopDays,
        })),
      },
    },
    include: { lines: true },
  });

  return NextResponse.json({
    runId: run.id,
    month,
    year,
    status: run.status,
    lineCount: run.lines.length,
  }, { status: 201 });
}
