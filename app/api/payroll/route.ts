import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { calculatePayroll, type PayrollCalculation } from "@/lib/utils/payrollEngine";
import { differenceInCalendarDays } from "date-fns";

const monthYearSchema = z.object({
  month: z.preprocess((value) => Number(value), z.number().int().min(1).max(12)).optional(),
  year: z.preprocess((value) => Number(value), z.number().int().min(2000)).optional(),
});

const createSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

const updateLinesSchema = z.object({
  lines: z.array(
    z.object({
      employeeId: z.string(),
      basicSalary: z.number(),
      specialAllowance: z.number(),
      meals: z.number().default(0),
      lop: z.number().default(0),
      lopDays: z.number().default(0),
      tds: z.number().default(0),
      arrears: z.number().default(0),
    })
  ),
});

function getPeriodDates(month: number, year: number) {
  // Cycle starts 24th of previous month and ends 25th of current month
  let prevMonth = month - 2;
  let prevYear = year;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
  }
  const start = new Date(prevYear, prevMonth, 24);
  const end = new Date(year, month - 1, 25);
  return { start, end };
}

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
  if (!session?.user || !["ADMIN", "COMPANY_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";
  const managedCompany = session.user.managedCompany;

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
  
  // Custom payroll range: 24th of previous month to 25th of current month
  const { start: periodStart, end: periodEnd } = getPeriodDates(month, year);
  const workingDays = countWorkingDays(periodStart, periodEnd);

  // Get previous period to compute new joinee arrears
  const prevMonthNum = month === 1 ? 12 : month - 1;
  const prevYearNum = month === 1 ? year - 1 : year;
  const { start: prevPeriodStart, end: prevPeriodEnd } = getPeriodDates(prevMonthNum, prevYearNum);

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
      deployedCompany: isCompanyAdmin && managedCompany ? managedCompany : undefined,
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
      attendanceRecords: {
        where: {
          workDate: { gte: periodStart, lte: periodEnd },
        },
        select: { workDate: true, status: true },
      },
    },
  });

  const payrollLines = employees.map((employee) => {
    const attendedDays = new Set(
      employee.attendanceRecords
        .filter((r) => ["PRESENT", "ON_LEAVE", "HOLIDAY", "WFH", "HALF_DAY"].includes(r.status))
        .map((r) => r.workDate.toISOString().split("T")[0])
    );
    const attendanceLopDays = Math.max(workingDays - attendedDays.size, 0);

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
    const totalLeavesTaken = employee.leaveBalances.reduce((sum, bal) => sum + (bal.used || 0), 0);

    // New Joinee Logic
    const isJoiningMonth = 
      employee.joiningDate >= periodStart && 
      employee.joiningDate <= periodEnd;

    const joinedInPrevPeriod = 
      employee.joiningDate >= prevPeriodStart && 
      employee.joiningDate <= prevPeriodEnd;

    let arrears = 0;
    if (joinedInPrevPeriod) {
      // Calculate arrears: (Monthly Salary / Days in Joining Month) * Working Days Worked
      const monthlySalary = (employee.basicSalary ?? 0) + (employee.specialAllowance ?? 0);
      const daysInJoiningMonth = new Date(employee.joiningDate.getFullYear(), employee.joiningDate.getMonth() + 1, 0).getDate();
      const workingDaysWorked = countWorkingDays(employee.joiningDate, prevPeriodEnd);
      arrears = Math.round((monthlySalary / daysInJoiningMonth) * workingDaysWorked);
    }

    let payroll: PayrollCalculation;
    if (isJoiningMonth) {
      // New Joinees get paid 0 in their joining month
      payroll = {
        grossEarnings: 0,
        pf: 0,
        esi: 0,
        professionalTax: 0,
        tds: 0,
        lop: 0,
        meals: 0,
        arrears: 0,
        totalDeductions: 0,
        netPay: 0,
        paidDays: 0,
        lopDays: workingDays,
      };
    } else {
      payroll = calculatePayroll(
        {
          basicSalary: employee.basicSalary,
          hra: 0,
          specialAllowance: employee.specialAllowance,
          professionalTax: 0,
          pan: employee.pan,
        },
        paidDays,
        workingDays,
        0, // meals default
        0, // tds default
        arrears
      );
    }

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      designation: employee.designation,
      basicSalary: employee.basicSalary ?? 0,
      hra: 0,
      specialAllowance: employee.specialAllowance ?? 0,
      grossEarnings: payroll.grossEarnings,
      pf: 0,
      esi: 0,
      professionalTax: 0,
      tds: payroll.tds,
      lop: payroll.lop,
      meals: payroll.meals,
      arrears: payroll.arrears,
      totalDeductions: payroll.totalDeductions,
      netPay: payroll.netPay,
      paidDays: payroll.paidDays,
      lopDays: payroll.lopDays,
      totalLeavesTaken,
      bankAccountNo: employee.bankAccountNo,
      bankName: employee.bankName,
      ifscCode: employee.ifscCode,
      pan: employee.pan,
    };
  });

  const displayLines = existingRun
    ? existingRun.lines
        .filter((line) => !isCompanyAdmin || line.employee.deployedCompany === managedCompany)
        .map((line) => {
          const preview = payrollLines.find((pl) => pl.employeeId === line.employeeId);
          return {
            employeeId: line.employeeId,
            employeeName: `${line.employee.firstName} ${line.employee.lastName}`,
            designation: line.employee.designation,
            basicSalary: line.basicSalary,
            hra: 0,
            specialAllowance: line.specialAllowance,
            grossEarnings: line.grossEarnings,
            pf: 0,
            esi: 0,
            professionalTax: 0,
            tds: line.tds,
            lop: line.lop,
            meals: line.meals,
            arrears: line.arrears,
            totalDeductions: line.totalDeductions,
            netPay: line.netPay,
            paidDays: line.paidDays,
            lopDays: line.lopDays,
            totalLeavesTaken: preview?.totalLeavesTaken ?? 0,
            bankAccountNo: line.employee.bankAccountNo,
            bankName: line.employee.bankName,
            ifscCode: line.employee.ifscCode,
            pan: line.employee.pan,
          };
        })
    : payrollLines;

  const totalGross = displayLines.reduce((sum, line) => sum + line.grossEarnings, 0);
  const totalNet = displayLines.reduce((sum, line) => sum + line.netPay, 0);
  const totalDeductions = displayLines.reduce((sum, line) => sum + line.totalDeductions, 0);

  return NextResponse.json({
    month,
    year,
    status: existingRun?.status ?? "DRAFT",
    hasRun: Boolean(existingRun),
    workingDays,
    totalEmployees: displayLines.length,
    totalGross,
    totalNet,
    totalDeductions,
    lines: displayLines,
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
  
  // Custom payroll period start & end dates
  const { start: periodStart, end: periodEnd } = getPeriodDates(month, year);
  const workingDays = countWorkingDays(periodStart, periodEnd);

  // Previous period ranges for new joinee arrears
  const prevMonthNum = month === 1 ? 12 : month - 1;
  const prevYearNum = month === 1 ? year - 1 : year;
  const { start: prevPeriodStart, end: prevPeriodEnd } = getPeriodDates(prevMonthNum, prevYearNum);

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
    const attendedDays = new Set(
      employee.attendanceRecords
        .filter((r) => ["PRESENT", "ON_LEAVE", "HOLIDAY", "WFH", "HALF_DAY"].includes(r.status))
        .map((r) => r.workDate.toISOString().split("T")[0])
    );
    const attendanceLopDays = Math.max(workingDays - attendedDays.size, 0);

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

    // New Joinee check
    const isJoiningMonth = 
      employee.joiningDate >= periodStart && 
      employee.joiningDate <= periodEnd;

    const joinedInPrevPeriod = 
      employee.joiningDate >= prevPeriodStart && 
      employee.joiningDate <= prevPeriodEnd;

    let arrears = 0;
    if (joinedInPrevPeriod) {
      const monthlySalary = (employee.basicSalary ?? 0) + (employee.specialAllowance ?? 0);
      const daysInJoiningMonth = new Date(employee.joiningDate.getFullYear(), employee.joiningDate.getMonth() + 1, 0).getDate();
      const workingDaysWorked = countWorkingDays(employee.joiningDate, prevPeriodEnd);
      arrears = Math.round((monthlySalary / daysInJoiningMonth) * workingDaysWorked);
    }

    let payroll: PayrollCalculation;
    if (isJoiningMonth) {
      payroll = {
        grossEarnings: 0,
        pf: 0,
        esi: 0,
        professionalTax: 0,
        tds: 0,
        lop: 0,
        meals: 0,
        arrears: 0,
        totalDeductions: 0,
        netPay: 0,
        paidDays: 0,
        lopDays: workingDays,
      };
    } else {
      payroll = calculatePayroll(
        {
          basicSalary: employee.basicSalary,
          hra: 0,
          specialAllowance: employee.specialAllowance,
          professionalTax: 0,
          pan: employee.pan,
        },
        paidDays,
        workingDays,
        0, // meals default
        0, // tds default
        arrears
      );
    }

    return {
      employeeId: employee.id,
      basicSalary: employee.basicSalary ?? 0,
      hra: 0,
      specialAllowance: employee.specialAllowance ?? 0,
      grossEarnings: payroll.grossEarnings,
      pf: 0,
      esi: 0,
      professionalTax: 0,
      tds: payroll.tds,
      lop: payroll.lop,
      meals: payroll.meals,
      arrears: payroll.arrears,
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
          hra: 0,
          specialAllowance: line.specialAllowance,
          overtimePay: 0,
          bonus: 0,
          grossEarnings: line.grossEarnings,
          pf: 0,
          esi: 0,
          professionalTax: 0,
          tds: line.tds,
          lop: line.lop,
          meals: line.meals,
          arrears: line.arrears,
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

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateLinesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lines } = parsed.data;

  await prisma.$transaction(
    lines.map((line) => {
      const grossEarnings = line.basicSalary + line.specialAllowance + line.arrears;
      const totalDeductions = line.meals + line.lop + line.tds;
      const netPay = grossEarnings - totalDeductions;

      return prisma.payrollLine.updateMany({
        where: {
          employeeId: line.employeeId,
          run: {
            status: "DRAFT",
          },
        },
        data: {
          basicSalary: line.basicSalary,
          specialAllowance: line.specialAllowance,
          meals: line.meals,
          lop: line.lop,
          lopDays: line.lopDays,
          tds: line.tds,
          arrears: line.arrears,
          grossEarnings,
          totalDeductions,
          netPay,
        },
      });
    })
  );

  return NextResponse.json({ success: true });
}
