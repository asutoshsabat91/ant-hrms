"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PayrollLine {
  employeeId: string;
  employeeName: string;
  designation: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
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
  totalLeavesTaken: number;
}

interface PayrollOverview {
  month: number;
  year: number;
  status: string;
  hasRun: boolean;
  workingDays: number;
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  lines: PayrollLine[];
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function PayrollDashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [overview, setOverview] = useState<PayrollOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  async function fetchPayrollData(selectedMonth: number, selectedYear: number) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payroll?month=${selectedMonth}&year=${selectedYear}`);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to load payroll preview.");
        setOverview(null);
      } else {
        setOverview(payload as PayrollOverview);
      }
    } catch {
      setError("Unable to load payroll preview.");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayrollData(month, year);
  }, [month, year]);

  async function runPayroll() {
    if (!overview) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to generate payroll.");
      } else {
        fetchPayrollData(month, year);
      }
    } catch {
      setError("Unable to generate payroll.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Payroll run preview</CardTitle>
              <CardDescription>
                Review month-end salary estimates, deductions, and draft payroll status.
              </CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Payroll month</label>
                <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{months[month - 1]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((label, index) => (
                      <SelectItem key={label} value={String(index + 1)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Payroll year</label>
                <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{String(year)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end justify-end">
                <Button
                  onClick={runPayroll}
                  disabled={submitting || loading || Boolean(overview?.hasRun)}
                  variant={overview?.hasRun ? "secondary" : "default"}
                >
                  {overview?.hasRun ? "Payroll generated" : submitting ? "Running..." : "Run payroll"}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[var(--neutral-500)]">Loading payroll preview…</p>
          ) : error ? (
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          ) : overview ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--neutral-500)]">Status</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--neutral-900)]">{overview.status}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--neutral-500)]">Employees</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--neutral-900)]">{overview.totalEmployees}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--neutral-500)]">Net payroll</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--neutral-900)]">₹{overview.totalNet.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[var(--neutral-500)]">Gross payroll</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--neutral-900)]">₹{overview.totalGross.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net pay</TableHead>
                      <TableHead>Paid days</TableHead>
                      <TableHead>LOP</TableHead>
                      <TableHead className="text-amber-700">Leaves Taken (YTD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.lines.map((line) => (
                      <TableRow key={line.employeeId}>
                        <TableCell>{line.employeeName}</TableCell>
                        <TableCell>{line.designation}</TableCell>
                        <TableCell>₹{line.grossEarnings.toLocaleString("en-IN")}</TableCell>
                        <TableCell>₹{line.totalDeductions.toLocaleString("en-IN")}</TableCell>
                        <TableCell>₹{line.netPay.toLocaleString("en-IN")}</TableCell>
                        <TableCell>{line.paidDays}</TableCell>
                        <TableCell>{line.lopDays}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                            {line.totalLeavesTaken ?? 0} days
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-[var(--neutral-500)]">
                Payroll preview generated for {months[overview.month - 1]} {overview.year}. Working days in period: {overview.workingDays}.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
