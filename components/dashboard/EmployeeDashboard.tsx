"use client";

import { DashboardAttendanceLogs } from "@/components/dashboard/DashboardAttendanceLogs";
import { LeaveBalancesCard } from "@/components/dashboard/LeaveBalancesCard";
import { CompanyCalendarWidget } from "@/components/dashboard/CompanyCalendarWidget";
import { UpcomingHolidaysWidget } from "@/components/dashboard/UpcomingHolidaysWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import Link from "next/link";
import { FileText, IndianRupee } from "lucide-react";
import { format } from "date-fns";

interface Props {
  name: string;
  todayPunches: { id: string; punchType: "IN" | "OUT"; punchedAt: string; location?: string | null }[];
  leaveBalances: { leaveType: { name: string; code: string }; allocated: number; used: number; pending: number }[];
  holidays: { date: string; name: string }[];
  calendarLeaves: { date: string; type: string; label: string }[];
  leaveTypes: { id: string; name: string; code: string }[];
  recentPayslips: { month: number; year: number; netPay: number; payslipUrl?: string | null }[];
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function EmployeeDashboard({
  name, todayPunches, leaveBalances, holidays, calendarLeaves, leaveTypes, recentPayslips,
}: Props) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            TODAY · {format(new Date(), "dd MMM yyyy").toUpperCase()}
          </p>
          <h2 className="text-3xl font-extrabold text-zinc-950 mt-1">
            {greeting},{" "}
            <span className="italic-serif text-4xl font-light text-[var(--purple)]">
              {name.split(" ")[0]}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Here&apos;s your personal workspace for today.
          </p>
        </div>
      </ScrollReveal>

      {/* Attendance + Leave + Calendar */}
      <div className="grid gap-4 lg:grid-cols-3 items-start">
        <ScrollReveal delayClass="reveal-delay-1">
          <DashboardAttendanceLogs punches={todayPunches} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-2">
          <LeaveBalancesCard balances={leaveBalances} />
        </ScrollReveal>
        <ScrollReveal delayClass="reveal-delay-3" className="space-y-4">
          <CompanyCalendarWidget holidays={holidays} leaves={calendarLeaves} leaveTypes={leaveTypes} />
          <UpcomingHolidaysWidget holidays={holidays} />
        </ScrollReveal>
      </div>

      {/* Recent Payslips */}
      {recentPayslips.length > 0 && (
        <ScrollReveal>
          <div className="rounded-xl border border-[var(--border)] bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Recent Payslips</p>
              <Link href="/portal?tab=payslips" className="text-[10px] font-semibold text-[var(--purple)]">All payslips →</Link>
            </div>
            <div className="space-y-2">
              {recentPayslips.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-700">
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-900 flex items-center gap-0.5">
                      <IndianRupee className="h-3 w-3" />
                      {p.netPay.toLocaleString("en-IN")}
                    </span>
                    {p.payslipUrl ? (
                      <a href={p.payslipUrl} target="_blank" rel="noreferrer"
                        className="text-[10px] font-semibold text-[var(--purple)] hover:underline">
                        Download
                      </a>
                    ) : (
                      <span className="text-[10px] text-zinc-300">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      <ScrollReveal delayClass="reveal-delay-4" className="pt-2">
        <QuickActions isAdmin={false} />
      </ScrollReveal>
    </div>
  );
}
