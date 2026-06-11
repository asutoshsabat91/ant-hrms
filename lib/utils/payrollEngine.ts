import type { Employee } from "@prisma/client";

export interface PayrollCalculation {
  grossEarnings: number;
  pf: number;
  esi: number;
  professionalTax: number;
  tds: number;
  lop: number;
  totalDeductions: number;
  netPay: number;
  paidDays: number;
  lopDays: number;
}

function calculateTDS(pan: string | null | undefined, grossMonthly: number): number {
  const annual = grossMonthly * 12;
  if (annual <= 250000) return 0;
  if (annual <= 500000) return Math.round(((annual - 250000) * 0.05) / 12);
  if (annual <= 1000000)
    return Math.round((12500 + (annual - 500000) * 0.2) / 12);
  return Math.round((112500 + (annual - 1000000) * 0.3) / 12);
}

export function calculatePayroll(
  employee: Pick<
    Employee,
    "basicSalary" | "hra" | "specialAllowance" | "professionalTax" | "pan"
  >,
  paidDays: number,
  totalWorkingDays: number
): PayrollCalculation {
  const basicSalary = employee.basicSalary ?? 0;
  const hra = employee.hra ?? 0;
  const specialAllowance = employee.specialAllowance ?? 0;
  const lopDays = Math.max(0, totalWorkingDays - paidDays);

  const fullGross = basicSalary + hra + specialAllowance;
  
  // Calculate earned salary components prorated by paidDays / totalWorkingDays
  const earnedBasic = totalWorkingDays > 0 ? (basicSalary / totalWorkingDays) * paidDays : 0;
  const earnedHra = totalWorkingDays > 0 ? (hra / totalWorkingDays) * paidDays : 0;
  const earnedSpecial = totalWorkingDays > 0 ? (specialAllowance / totalWorkingDays) * paidDays : 0;

  // Actual earned gross salary (this is the true gross before standard deductions)
  const grossEarnings = earnedBasic + earnedHra + earnedSpecial;
  const lopDeduction = fullGross - grossEarnings;

  // No PF deduction per company policy
  const pf = 0;
  
  // ESI is 0.75% of actual earned gross earnings, only if gross monthly <= 21000
  const esi = grossEarnings <= 21000 ? Math.round(grossEarnings * 0.0075) : 0;
  
  const professionalTax = employee.professionalTax ?? 200;
  
  // TDS is calculated based on actual earned gross earnings
  const tds = calculateTDS(employee.pan, grossEarnings);

  // Total deductions include PF, ESI, Professional Tax, and TDS (LOP is NOT added to deductions sum to avoid double deduction)
  const totalDeductions = pf + esi + professionalTax + tds;
  const netPay = grossEarnings - totalDeductions;

  return {
    grossEarnings: Math.round(grossEarnings),
    pf,
    esi,
    professionalTax,
    tds,
    lop: Math.round(lopDeduction),
    totalDeductions: Math.round(totalDeductions),
    netPay: Math.round(netPay),
    paidDays,
    lopDays,
  };
}

/**
 * AntBox CTC Breakdown (company policy):
 *   Basic = 50% of annual CTC ÷ 12   (monthly)
 *   HRA   = 20% of annual CTC ÷ 12   (monthly)
 *   Special Allowance = 30% of annual CTC ÷ 12  (monthly)
 *   No PF deduction. Variables are awarded annually — not CTC-based.
 *   Interns: full stipend = Basic only, no HRA, no Special Allowance.
 */
export function breakdownFromCTC(
  ctc: number,
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN" = "FULL_TIME"
) {
  if (employmentType === "INTERN") {
    const basicSalary = Math.round(ctc / 12);
    return { basicSalary, hra: 0, specialAllowance: 0, pf: 0, monthly: basicSalary };
  }
  const basicSalary = Math.round(ctc * 0.50 / 12);
  const hra = Math.round(ctc * 0.20 / 12);
  const specialAllowance = Math.round(ctc * 0.30 / 12);
  return { basicSalary, hra, specialAllowance, pf: 0, monthly: basicSalary + hra + specialAllowance };
}
