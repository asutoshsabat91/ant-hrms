import type { Employee } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays } from "date-fns";

export interface PayrollCalculation {
  grossEarnings: number;
  pf: number;
  esi: number;
  professionalTax: number;
  tds: number;
  lop: number;
  meals: number;
  arrears: number;
  totalDeductions: number;
  netPay: number;
  paidDays: number;
  lopDays: number;
}

export function calculatePayroll(
  employee: Pick<
    Employee,
    "basicSalary" | "hra" | "specialAllowance" | "professionalTax" | "pan"
  >,
  paidDays: number,
  totalWorkingDays: number,
  meals: number = 0,
  tds: number = 0,
  arrears: number = 0
): PayrollCalculation {
  const basicSalary = employee.basicSalary ?? 0;
  const specialAllowance = employee.specialAllowance ?? 0;
  const lopDays = Math.max(0, totalWorkingDays - paidDays);

  const fullGross = basicSalary + specialAllowance;
  
  // Calculate earned salary components prorated by paidDays / totalWorkingDays
  const earnedBasic = totalWorkingDays > 0 ? (basicSalary / totalWorkingDays) * paidDays : 0;
  const earnedSpecial = totalWorkingDays > 0 ? (specialAllowance / totalWorkingDays) * paidDays : 0;

  // Actual earned gross salary includes arrears
  const grossEarnings = earnedBasic + earnedSpecial + arrears;
  const lopDeduction = totalWorkingDays > 0 ? (fullGross / totalWorkingDays) * lopDays : 0;

  // No PF, ESI, or Professional Tax per company policy
  const pf = 0;
  const esi = 0;
  const professionalTax = 0;

  // Total deductions include Meals, LOP, and TDS
  const totalDeductions = meals + lopDeduction + tds;
  const netPay = grossEarnings - totalDeductions;

  return {
    grossEarnings: Math.round(grossEarnings),
    pf,
    esi,
    professionalTax,
    tds,
    lop: Math.round(lopDeduction),
    meals,
    arrears,
    totalDeductions: Math.round(totalDeductions),
    netPay: Math.round(netPay),
    paidDays,
    lopDays,
  };
}

/**
 * AntBox CTC Breakdown (company policy):
 *   Basic = 70% of annual CTC ÷ 12   (monthly)
 *   Special Allowance = 30% of annual CTC ÷ 12  (monthly)
 *   No HRA, No PF.
 *   Interns: full stipend = Basic only, no Special Allowance.
 */
export function breakdownFromCTC(
  ctc: number,
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN" = "FULL_TIME"
) {
  if (employmentType === "INTERN") {
    const basicSalary = Math.round(ctc / 12);
    return { basicSalary, hra: 0, specialAllowance: 0, pf: 0, monthly: basicSalary };
  }
  const basicSalary = Math.round(ctc * 0.70 / 12);
  const specialAllowance = Math.round(ctc * 0.30 / 12);
  return { basicSalary, hra: 0, specialAllowance, pf: 0, monthly: basicSalary + specialAllowance };
}

// ─── Helper functions for auto-syncing LOP days with attendance/leaves ───

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

export async function syncEmployeePayrollForDate(employeeId: string, date: Date) {
  const day = date.getDate();
  const monthIdx = date.getMonth();
  const yearVal = date.getFullYear();

  let payrollMonth: number;
  let payrollYear: number;

  // Cycle from 24th of prev month to 25th of current month
  if (day >= 24) {
    if (monthIdx === 11) {
      payrollMonth = 1;
      payrollYear = yearVal + 1;
    } else {
      payrollMonth = monthIdx + 2;
      payrollYear = yearVal;
    }
  } else {
    payrollMonth = monthIdx + 1;
    payrollYear = yearVal;
  }

  // Find if there is a DRAFT payroll run for this month and year
  const draftRun = await prisma.payrollRun.findUnique({
    where: { month_year: { month: payrollMonth, year: payrollYear } },
  });

  if (!draftRun || draftRun.status !== "DRAFT") {
    return;
  }

  // Find the employee and their corresponding line
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      leaveRequests: {
        where: {
          status: "APPROVED",
          startDate: { lte: draftRun.periodEnd },
          endDate: { gte: draftRun.periodStart },
        },
        include: { leaveType: true },
      },
      attendanceRecords: {
        where: {
          workDate: { gte: draftRun.periodStart, lte: draftRun.periodEnd },
        },
        select: { workDate: true, status: true },
      },
    },
  });

  if (!employee || employee.basicSalary === null) {
    return;
  }

  // Check if this line exists in draft run
  const existingLine = await prisma.payrollLine.findFirst({
    where: { runId: draftRun.id, employeeId },
  });

  if (!existingLine) {
    return;
  }

  const workingDays = countWorkingDays(draftRun.periodStart, draftRun.periodEnd);

  // Recalculate LOP days based on attendance/leaves in this period
  const attendedDays = new Set(
    employee.attendanceRecords
      .filter((r) => ["PRESENT", "ON_LEAVE", "HOLIDAY", "WFH", "HALF_DAY"].includes(r.status))
      .map((r) => r.workDate.toISOString().split("T")[0])
  );
  const attendanceLopDays = Math.max(workingDays - attendedDays.size, 0);

  const leaveDays = employee.leaveRequests.reduce((total, leave) => {
    if (leave.leaveType.code === "LOP") {
      return total + overlapDays(leave.startDate, leave.endDate, draftRun.periodStart, draftRun.periodEnd);
    }
    if (leave.leaveType.code === "SICK") {
      const overlap = overlapDays(leave.startDate, leave.endDate, draftRun.periodStart, draftRun.periodEnd);
      const sickLopRatio = leave.days > 0 ? (leave.sickLopDays / leave.days) : 0;
      return total + (overlap * sickLopRatio);
    }
    return total;
  }, 0);

  const lopDaysResolved = employee.attendanceRecords.length > 0 ? attendanceLopDays : leaveDays;
  const paidDays = Math.max(workingDays - lopDaysResolved, 0);

  // New Joinee check
  const isJoiningMonth = 
    employee.joiningDate >= draftRun.periodStart && 
    employee.joiningDate <= draftRun.periodEnd;

  const arrears = existingLine.arrears;
  const basicSalary = existingLine.basicSalary;
  const specialAllowance = existingLine.specialAllowance;
  const meals = existingLine.meals;
  const tds = existingLine.tds;

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
        basicSalary,
        hra: 0,
        specialAllowance,
        professionalTax: 0,
        pan: employee.pan,
      },
      paidDays,
      workingDays,
      meals,
      tds,
      arrears
    );
  }

  // Update PayrollLine in draft run
  await prisma.payrollLine.update({
    where: { id: existingLine.id },
    data: {
      lopDays: payroll.lopDays,
      paidDays: payroll.paidDays,
      lop: payroll.lop,
      grossEarnings: payroll.grossEarnings,
      totalDeductions: payroll.totalDeductions,
      netPay: payroll.netPay,
    },
  });
}

