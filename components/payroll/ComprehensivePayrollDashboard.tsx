"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  X,
  TrendingUp,
  Users,
  IndianRupee,
  CalendarDays,
  AlertCircle,
  Play,
  Eye,
  Loader2,
  Building2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LeaveBreakdown {
  leaveTypeName: string;
  allocated: number;
  used: number;
  remaining: number;
}

interface PayrollLine {
  employeeId: string;
  employeeName: string;
  designation: string;
  department?: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  overtimePay?: number;
  bonus?: number;
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
  workingDays: number;
  totalLeavesTaken: number;
  leaveBreakdown?: LeaveBreakdown[];
  bankName?: string;
  bankAccountNo?: string;
  ifscCode?: string;
  pan?: string;
  employeeCode?: string;
  joiningDate?: string;
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
  totalDeductions: number;
  lines: PayrollLine[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  DRAFT:      { label: "Draft",      color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-500"   },
  PROCESSING: { label: "Processing", color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     dot: "bg-blue-500"    },
  APPROVED:   { label: "Approved",   color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  PAID:       { label: "Paid",       color: "text-violet-700",  bg: "bg-violet-50 border-violet-200", dot: "bg-violet-500"  },
  FAILED:     { label: "Failed",     color: "text-rose-700",    bg: "bg-rose-50 border-rose-200",     dot: "bg-rose-500"    },
};

// ─── Payslip Modal ───────────────────────────────────────────────────────────

function PayslipModal({
  line,
  month,
  year,
  onClose,
}: {
  line: PayrollLine;
  month: number;
  year: number;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`
      <html><head><title>Payslip — ${line.employeeName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; padding: 32px; color: #18181b; font-size: 13px; }
        .payslip { max-width: 740px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #09090b; margin-bottom: 20px; }
        .company-name { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; }
        .payslip-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; }
        .emp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; padding: 16px; background: #fafafa; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e4e4e7; }
        .emp-field label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #a1a1aa; display: block; }
        .emp-field span { font-size: 12px; font-weight: 600; color: #09090b; }
        .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px; margin-bottom: 10px; }
        .salary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .salary-col { border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden; }
        .salary-col-header { background: #fafafa; padding: 8px 14px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; border-bottom: 1px solid #e4e4e7; }
        .salary-row { display: flex; justify-content: space-between; padding: 7px 14px; border-bottom: 1px solid #f4f4f5; }
        .salary-row:last-child { border-bottom: none; }
        .salary-row span { font-size: 12px; }
        .salary-row .amount { font-weight: 600; color: #09090b; }
        .total-row { display: flex; justify-content: space-between; padding: 10px 14px; background: #09090b; color: white; border-radius: 6px; margin-top: 6px; }
        .total-row span { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
        .net-pay-box { background: #09090b; color: white; border-radius: 10px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
        .net-pay-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; }
        .net-pay-amount { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; }
        .leave-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
        .leave-card { padding: 10px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; text-align: center; }
        .leave-card .type { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; margin-bottom: 4px; }
        .leave-card .count { font-size: 18px; font-weight: 900; color: #09090b; }
        .leave-card .sub { font-size: 9px; color: #a1a1aa; font-weight: 500; }
        .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e4e4e7; display: flex; justify-content: space-between; font-size: 10px; color: #a1a1aa; }
      </style></head><body>
      <div class="payslip">${content}</div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 720,
        maxHeight: "92vh",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #f1f5f9", background: "#fafafa", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a1a1aa" }}>Employee Payslip</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#09090b", marginTop: 2 }}>
              {line.employeeName} — {MONTHS[month - 1]} {year}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e4e4e7", borderRadius: 10, padding: "7px 14px", fontSize: 11, fontWeight: 700, background: "#fff", cursor: "pointer", color: "#3f3f46" }}
            >
              <Printer size={13} /> Print / Save
            </button>
            <button
              onClick={onClose}
              style={{ border: "1px solid #e4e4e7", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", cursor: "pointer", color: "#71717a" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ overflowY: "auto", padding: 24 }}>
          <div ref={printRef}>
            {/* Payslip Header */}
            <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 20, borderBottom: "2px solid #09090b", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 28, height: 28, background: "#09090b", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 size={14} color="#fff" />
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", color: "#09090b" }}>AntBox HRMS</span>
                </div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#71717a" }}>Bhubaneswar, Odisha</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#71717a" }}>Payslip</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#09090b", marginTop: 2 }}>{MONTHS[month - 1]} {year}</p>
              </div>
            </div>

            {/* Employee Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 32px", padding: 16, background: "#fafafa", borderRadius: 10, marginBottom: 20, border: "1px solid #e4e4e7" }}>
              {[
                { label: "Employee Name", value: line.employeeName },
                { label: "Employee ID", value: line.employeeCode || line.employeeId.slice(-8).toUpperCase() },
                { label: "Designation", value: line.designation },
                { label: "Department", value: line.department || "—" },
                { label: "PAN", value: line.pan || "—" },
                { label: "Bank Account", value: line.bankAccountNo ? `****${line.bankAccountNo.slice(-4)}` : "—" },
                { label: "Paid Days", value: `${line.paidDays} / ${line.workingDays || line.paidDays + line.lopDays}` },
                { label: "LOP Days", value: `${line.lopDays}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ paddingBottom: 8 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a1a1aa", display: "block", marginBottom: 2 }}>{label}</label>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#09090b" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Earnings & Deductions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* Earnings */}
              <div style={{ border: "1px solid #e4e4e7", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: "#fafafa", padding: "10px 16px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#71717a", borderBottom: "1px solid #e4e4e7" }}>
                  Earnings
                </div>
                {[
                  { label: "Basic Salary", value: line.basicSalary },
                  { label: "Special Allowance", value: line.specialAllowance },
                  ...(line.arrears && line.arrears > 0 ? [{ label: "Arrears (Deferred Pay)", value: line.arrears }] : []),
                  ...(line.bonus && line.bonus > 0 ? [{ label: "Bonus", value: line.bonus }] : []),
                  ...(line.overtimePay && line.overtimePay > 0 ? [{ label: "Overtime Pay", value: line.overtimePay }] : []),
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #f4f4f5" }}>
                    <span style={{ fontSize: 12, color: "#52525b" }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#09090b" }}>₹{value.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", background: "#09090b" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.7)" }}>Gross Earnings</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>₹{line.grossEarnings.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ border: "1px solid #e4e4e7", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: "#fafafa", padding: "10px 16px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#71717a", borderBottom: "1px solid #e4e4e7" }}>
                  Deductions
                </div>
                {[
                  { label: "Meals Taken", value: line.meals },
                  { label: "Loss of Pay (LOP)", value: line.lop },
                  { label: "TDS", value: line.tds },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid #f4f4f5" }}>
                    <span style={{ fontSize: 12, color: "#52525b" }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: value > 0 ? "#e11d48" : "#a1a1aa" }}>
                      {value > 0 ? `₹${value.toLocaleString("en-IN")}` : "—"}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", background: "#09090b" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.7)" }}>Total Deductions</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#f87171" }}>₹{line.totalDeductions.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div style={{ background: "#09090b", color: "#fff", borderRadius: 12, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Net Pay (Take Home)</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>For the month of {MONTHS[month - 1]} {year}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em" }}>₹{line.netPay.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Leave Summary */}
            <div style={{ border: "1px solid #e4e4e7", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "10px 16px", background: "#fafafa", borderBottom: "1px solid #e4e4e7" }}>
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#71717a" }}>Leave Summary (Year-to-Date)</p>
              </div>
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                {line.leaveBreakdown && line.leaveBreakdown.length > 0 ? (
                  line.leaveBreakdown.map((lb) => (
                    <div key={lb.leaveTypeName} style={{ padding: 12, background: "#fafafa", border: "1px solid #e4e4e7", borderRadius: 8, textAlign: "center" }}>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a1a1aa", marginBottom: 4 }}>{lb.leaveTypeName}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: "#09090b" }}>{lb.used}</p>
                      <p style={{ fontSize: 9, color: "#a1a1aa", fontWeight: 500 }}>/ {lb.allocated} days</p>
                    </div>
                  ))
                ) : (
                  <>
                    <div style={{ padding: 12, background: "#fafafa", border: "1px solid #e4e4e7", borderRadius: 8, textAlign: "center" }}>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a1a1aa", marginBottom: 4 }}>Total Taken</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: "#09090b" }}>{line.totalLeavesTaken ?? 0}</p>
                      <p style={{ fontSize: 9, color: "#a1a1aa", fontWeight: 500 }}>days YTD</p>
                    </div>
                    <div style={{ padding: 12, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, textAlign: "center" }}>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#c2410c", marginBottom: 4 }}>LOP Days</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: "#c2410c" }}>{line.lopDays}</p>
                      <p style={{ fontSize: 9, color: "#c2410c", fontWeight: 500 }}>this month</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ paddingTop: 16, borderTop: "1px solid #e4e4e7", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#a1a1aa" }}>
              <p>This is a computer-generated payslip. No signature required.</p>
              <p>AntBox HRMS · {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
export function ComprehensivePayrollDashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [overview, setOverview] = useState<PayrollOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdits, setSavingEdits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "payslips" | "breakdown" | "history">("overview");
  const [historyRuns, setHistoryRuns] = useState<{ id: string; month: number; year: number; status: string; totalNet?: number; totalGross?: number; createdAt: string; lineCount?: number }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollLine | null>(null);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  const [editedLines, setEditedLines] = useState<Record<string, {
    basicSalary: number;
    specialAllowance: number;
    meals: number;
    lop: number;
    lopDays: number;
    tds: number;
    arrears: number;
  }>>({});

  useEffect(() => { setMounted(true); }, []);

  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur - 1, cur, cur + 1];
  }, []);

  const fetchPayroll = useCallback(async (m: number, y: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payroll?month=${m}&year=${y}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Unable to load payroll."); setOverview(null); }
      else setOverview(data);
    } catch { setError("Unable to load payroll."); setOverview(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayroll(month, year); }, [month, year, fetchPayroll]);

  useEffect(() => {
    if (overview?.lines) {
      const initial: typeof editedLines = {};
      overview.lines.forEach((line) => {
        initial[line.employeeId] = {
          basicSalary: line.basicSalary,
          specialAllowance: line.specialAllowance,
          meals: line.meals || 0,
          lop: line.lop,
          lopDays: line.lopDays,
          tds: line.tds || 0,
          arrears: line.arrears || 0,
        };
      });
      setEditedLines(initial);
    }
  }, [overview]);

  const updateLineField = useCallback((employeeId: string, field: string, val: number) => {
    setEditedLines((prev) => {
      const line = prev[employeeId] ? { ...prev[employeeId] } : {
        basicSalary: 0,
        specialAllowance: 0,
        meals: 0,
        lop: 0,
        lopDays: 0,
        tds: 0,
        arrears: 0,
      };
      type LineField = "basicSalary" | "specialAllowance" | "meals" | "lop" | "lopDays" | "tds" | "arrears";
      line[field as LineField] = val;
      return {
        ...prev,
        [employeeId]: line,
      };
    });
  }, []);

  const [focusedInput, setFocusedInput] = useState<{ employeeId: string; field: string } | null>(null);

  const renderEditableCell = useCallback((
    employeeId: string,
    field: string,
    value: number,
    widthClass: string = "w-24"
  ) => {
    const isFocused = focusedInput?.employeeId === employeeId && focusedInput?.field === field;
    const displayVal = isFocused 
      ? (value === 0 ? "" : value.toString()) 
      : `₹${value.toLocaleString("en-IN")}`;

    return (
      <input
        type="text"
        value={displayVal}
        onFocus={() => setFocusedInput({ employeeId, field })}
        onBlur={() => setFocusedInput(null)}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          updateLineField(employeeId, field, digits ? parseInt(digits, 10) : 0);
        }}
        className={`${widthClass} rounded border border-zinc-200 bg-zinc-50/30 px-2 py-1 text-xs text-right font-semibold text-zinc-800 outline-none focus:border-zinc-950 focus:bg-white focus:shadow-sm`}
      />
    );
  }, [focusedInput, updateLineField]);

  const renderEditableDaysCell = useCallback((
    employeeId: string,
    field: string,
    value: number,
    widthClass: string = "w-16"
  ) => {
    const isFocused = focusedInput?.employeeId === employeeId && focusedInput?.field === field;
    const displayVal = isFocused && value === 0 ? "" : value.toString();

    return (
      <input
        type="text"
        value={displayVal}
        onFocus={() => setFocusedInput({ employeeId, field })}
        onBlur={() => setFocusedInput(null)}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          updateLineField(employeeId, field, digits ? parseInt(digits, 10) : 0);
        }}
        className={`${widthClass} rounded border border-zinc-200 bg-zinc-50/30 px-2 py-1 text-xs text-center font-semibold text-zinc-800 outline-none focus:border-zinc-950 focus:bg-white focus:shadow-sm`}
      />
    );
  }, [focusedInput, updateLineField]);

  const saveOverrides = useCallback(async () => {
    setSavingEdits(true);
    setError(null);
    try {
      const payload = Object.entries(editedLines).map(([employeeId, vals]) => ({
        employeeId,
        ...vals,
      }));
      const res = await fetch("/api/payroll", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save changes.");
      } else {
        fetchPayroll(month, year);
      }
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSavingEdits(false);
    }
  }, [editedLines, month, year, fetchPayroll]);

  useEffect(() => {
    if (activeTab !== "history") return;
    fetch("/api/payroll/history")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setHistoryRuns(d); })
      .catch(() => {});
  }, [activeTab]);

  const runPayroll = useCallback(async () => {
    if (!overview) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Unable to run payroll.");
      else fetchPayroll(month, year);
    } catch { setError("Unable to run payroll."); }
    finally { setSubmitting(false); }
  }, [overview, month, year, fetchPayroll]);

  const filteredLines = useMemo(() => {
    if (!overview?.lines) return [];
    if (!search) return overview.lines;
    const q = search.toLowerCase();
    return overview.lines.filter((l) =>
      l.employeeName.toLowerCase().includes(q) || l.designation.toLowerCase().includes(q)
    );
  }, [overview?.lines, search]);

  const statusCfg = STATUS_CONFIG[overview?.status || "DRAFT"] || STATUS_CONFIG.DRAFT;

  // ── Stat Cards ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!overview) return [];
    return [
      {
        icon: IndianRupee,
        label: "Net Payroll",
        value: `₹${overview.totalNet.toLocaleString("en-IN")}`,
        sub: `Gross ₹${overview.totalGross.toLocaleString("en-IN")}`,
        accent: "text-emerald-600",
        bg: "bg-emerald-50",
      },
      {
        icon: TrendingUp,
        label: "Total Deductions",
        value: `₹${(overview.totalGross - overview.totalNet).toLocaleString("en-IN")}`,
        sub: `${Math.round(((overview.totalGross - overview.totalNet) / (overview.totalGross || 1)) * 100)}% of gross`,
        accent: "text-rose-600",
        bg: "bg-rose-50",
      },
      {
        icon: Users,
        label: "Employees",
        value: `${overview.totalEmployees}`,
        sub: `Active on payroll`,
        accent: "text-blue-600",
        bg: "bg-blue-50",
      },
      {
        icon: CalendarDays,
        label: "Working Days",
        value: `${overview.workingDays}`,
        sub: `${MONTHS[overview.month - 1]} ${overview.year}`,
        accent: "text-violet-600",
        bg: "bg-violet-50",
      },
    ];
  }, [overview]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">PAYROLL</p>
          <h2 className="text-3xl font-extrabold text-zinc-950 mt-1">
            Pay your <span className="italic font-light text-4xl">people</span>.
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Generate, preview, and approve monthly payroll with leave-based LOP calculations.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap self-start">
          {/* Month Selector */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-900 shadow-sm"
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>

          {/* Year Selector */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-900 shadow-sm"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Status Badge */}
          {overview && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
          )}

          {/* Run Payroll Button */}
          <button
            onClick={runPayroll}
            disabled={submitting || loading || Boolean(overview?.hasRun)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors shadow-sm ${
              overview?.hasRun
                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200"
                : "bg-zinc-950 text-white hover:bg-zinc-800"
            }`}
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {overview?.hasRun ? "Payroll done" : submitting ? "Running…" : "Run payroll"}
          </button>

          {/* Save Changes Button */}
          {overview && overview.status === "DRAFT" && (
            <button
              onClick={saveOverrides}
              disabled={savingEdits || loading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {savingEdits ? <Loader2 size={13} className="animate-spin" /> : null}
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            <p className="text-xs text-zinc-400 font-medium">Loading payroll data…</p>
          </div>
        </div>
      ) : overview ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-xl border border-zinc-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{stat.label}</p>
                    <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${stat.accent}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-extrabold ${stat.accent} leading-none`}>{stat.value}</p>
                  <p className="text-[10px] text-zinc-400 font-medium mt-1">{stat.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-zinc-100 bg-zinc-50 p-1 w-fit">
            {(["overview", "payslips", "breakdown", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-1.5 text-[11px] font-bold capitalize transition-all ${
                  activeTab === tab
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-700"
                }`}
              >
                {tab === "overview" ? "Overview" : tab === "payslips" ? "Employee Payslips" : tab === "breakdown" ? "Salary Breakdown" : "History"}
              </button>
            ))}
          </div>

          {/* ── Tab: Overview ─────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="rounded-xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-50">
                <p className="text-sm font-bold text-zinc-900">Payroll Summary — {MONTHS[overview.month - 1]} {overview.year}</p>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  {overview.workingDays} working days · {overview.totalEmployees} employees on roll
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Bank Account</th>
                      <th className="px-4 py-3 text-right">Basic</th>
                      <th className="px-4 py-3 text-right">Special Allow.</th>
                      <th className="px-4 py-3 text-right">Gross</th>
                      <th className="px-4 py-3 text-right text-rose-600">Deductions</th>
                      <th className="px-4 py-3 text-right text-emerald-700">Net Pay</th>
                      <th className="px-4 py-3 text-center text-amber-700">Leaves (YTD)</th>
                      <th className="px-4 py-3 text-center text-orange-700">LOP Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {overview.lines.map((line) => {
                      const isDraft = overview.status === "DRAFT";
                      const local = editedLines[line.employeeId] || {
                        basicSalary: line.basicSalary,
                        specialAllowance: line.specialAllowance,
                        meals: line.meals,
                        lop: line.lop,
                        lopDays: line.lopDays,
                        tds: line.tds,
                        arrears: 0,
                      };

                      const computedGross = local.basicSalary + local.specialAllowance;
                      const computedDeductions = local.meals + local.lop + local.tds;
                      const computedNet = computedGross - computedDeductions;

                      return (
                        <tr key={line.employeeId} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-zinc-900 text-xs">{line.employeeName}</p>
                            <p className="text-[10px] text-zinc-400">{line.designation}</p>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-zinc-500">
                            {line.bankAccountNo ? `****${line.bankAccountNo.slice(-4)}` : "—"}
                          </td>
                          
                          {/* Basic Salary */}
                          <td className="px-4 py-3 text-right">
                            {isDraft ? (
                              renderEditableCell(line.employeeId, "basicSalary", local.basicSalary)
                            ) : (
                              <span className="text-xs font-medium text-zinc-700">₹{line.basicSalary.toLocaleString("en-IN")}</span>
                            )}
                          </td>

                          {/* Special Allowance */}
                          <td className="px-4 py-3 text-right">
                            {isDraft ? (
                              renderEditableCell(line.employeeId, "specialAllowance", local.specialAllowance)
                            ) : (
                              <span className="text-xs font-medium text-zinc-700">₹{line.specialAllowance.toLocaleString("en-IN")}</span>
                            )}
                          </td>

                          {/* Gross Earnings */}
                          <td className="px-4 py-3 text-right text-xs font-bold text-zinc-900">
                            ₹{computedGross.toLocaleString("en-IN")}
                          </td>

                          {/* Deductions */}
                          <td className="px-4 py-3 text-right text-xs font-bold text-rose-600">
                            ₹{computedDeductions.toLocaleString("en-IN")}
                          </td>

                          {/* Net Pay */}
                          <td className="px-4 py-3 text-right text-xs font-extrabold text-emerald-700">
                            ₹{computedNet.toLocaleString("en-IN")}
                          </td>

                          {/* Leaves YTD */}
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              {line.totalLeavesTaken ?? 0}d
                            </span>
                          </td>

                          {/* LOP Days */}
                          <td className="px-4 py-3 text-center">
                            {local.lopDays > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                                {local.lopDays}d LOP
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-300 font-medium">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-zinc-200 bg-zinc-50">
                    <tr>
                      <td className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">TOTAL</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      
                      {/* Computed Total Gross */}
                      <td className="px-4 py-3 text-right text-xs font-extrabold text-zinc-900">
                        ₹{overview.lines.reduce((sum, line) => {
                          const local = editedLines[line.employeeId] || line;
                          return sum + (local.basicSalary + local.specialAllowance);
                        }, 0).toLocaleString("en-IN")}
                      </td>

                      {/* Computed Total Deductions */}
                      <td className="px-4 py-3 text-right text-xs font-extrabold text-rose-600">
                        ₹{overview.lines.reduce((sum, line) => {
                          const local = editedLines[line.employeeId] || line;
                          return sum + (local.meals + local.lop + local.tds);
                        }, 0).toLocaleString("en-IN")}
                      </td>

                      {/* Computed Total Net Pay */}
                      <td className="px-4 py-3 text-right text-xs font-extrabold text-emerald-700">
                        ₹{overview.lines.reduce((sum, line) => {
                          const local = editedLines[line.employeeId] || line;
                          const gross = local.basicSalary + local.specialAllowance;
                          const ded = local.meals + local.lop + local.tds;
                          return sum + (gross - ded);
                        }, 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Employee Payslips ────────────────────────────────── */}
          {activeTab === "payslips" && (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-3">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or designation…"
                  className="flex-1 max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-zinc-900 shadow-sm"
                />
                <p className="text-xs text-zinc-400 font-medium">{filteredLines.length} employees</p>
              </div>

              {/* Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredLines.map((line) => (
                  <div
                    key={line.employeeId}
                    className="rounded-xl border border-zinc-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
                  >
                    {/* Card Header */}
                    <div className="p-5 border-b border-zinc-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-zinc-950 flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0">
                            {line.employeeName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-zinc-950 leading-tight">{line.employeeName}</p>
                            <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">{line.designation}</p>
                          </div>
                        </div>
                        {line.lopDays > 0 && (
                          <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[9px] font-bold text-orange-700 flex-shrink-0">
                            {line.lopDays}d LOP
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-3">
                      {/* Net Pay highlight */}
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Net Pay</p>
                        <p className="text-lg font-extrabold text-zinc-950">₹{line.netPay.toLocaleString("en-IN")}</p>
                      </div>

                      {/* Earnings vs Deductions bar */}
                      <div>
                        <div className="flex justify-between text-[9px] text-zinc-400 font-semibold mb-1">
                          <span>Gross ₹{line.grossEarnings.toLocaleString("en-IN")}</span>
                          <span className="text-rose-500">-₹{line.totalDeductions.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-rose-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((line.netPay / (line.grossEarnings || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Breakdown row */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Meals", value: line.meals || 0 },
                          { label: "TDS", value: line.tds || 0 },
                          { label: "LOP", value: line.lop || 0 },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-lg bg-zinc-50 border border-zinc-100 p-2 text-center">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase">{label}</p>
                            <p className="text-[11px] font-bold text-zinc-700 mt-0.5">₹{value.toLocaleString("en-IN")}</p>
                          </div>
                        ))}
                      </div>
{/* Leaves YTD */}
                      <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-amber-600" />
                          <span className="text-[10px] font-bold text-amber-700">Leaves taken (YTD)</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-amber-800">{line.totalLeavesTaken ?? 0} days</span>
                      </div>

                      {/* Paid days */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                        <span>Paid days: <strong className="text-zinc-800">{line.paidDays}</strong></span>
                        <span>Working: <strong className="text-zinc-800">{line.workingDays || overview.workingDays}</strong></span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 py-3 border-t border-zinc-50 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                        {MONTHS[month - 1]} {year}
                      </span>
                      <button
                        onClick={() => setSelectedEmployee(line)}
                        className="flex items-center gap-1 rounded-lg bg-zinc-950 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-zinc-800 transition-colors"
                      >
                        <Eye size={10} />
                        View Payslip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Salary Breakdown ─────────────────────────────────── */}
          {activeTab === "breakdown" && (
            <div className="rounded-xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-50">
                <p className="text-sm font-bold text-zinc-900">Component-wise Salary Breakdown</p>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">Per-employee breakdown of all earnings, meals, and loss of pay</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 sticky left-0 bg-zinc-50 z-10">Employee</th>
                      <th className="px-4 py-3 text-right text-blue-700">Basic</th>
                      <th className="px-4 py-3 text-right text-blue-500">S.Allow.</th>
                      <th className="px-4 py-3 text-right font-extrabold text-zinc-700">Gross</th>
                      <th className="px-4 py-3 text-right text-rose-500">Meals</th>
                      <th className="px-4 py-3 text-right text-rose-600">LOP</th>
                      <th className="px-4 py-3 text-right text-rose-400">TDS</th>
                      <th className="px-4 py-3 text-right text-rose-700 font-extrabold">Total Ded.</th>
                      <th className="px-4 py-3 text-right text-emerald-700 font-extrabold">Net Pay</th>
                      <th className="px-4 py-3 text-center text-orange-600">LOP Days</th>
                      <th className="px-4 py-3 text-center text-amber-700">Leaves YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {overview.lines.map((line) => {
                      const isDraft = overview.status === "DRAFT";
                      const local = editedLines[line.employeeId] || {
                        basicSalary: line.basicSalary,
                        specialAllowance: line.specialAllowance,
                        meals: line.meals,
                        lop: line.lop,
                        lopDays: line.lopDays,
                        tds: line.tds,
                        arrears: 0,
                      };

                      const computedGross = local.basicSalary + local.specialAllowance;
                      const computedDeductions = local.meals + local.lop + local.tds;
                      const computedNet = computedGross - computedDeductions;

                      return (
                        <tr key={line.employeeId} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-zinc-50">
                            <p className="font-bold text-zinc-900">{line.employeeName}</p>
                            <p className="text-[9px] text-zinc-400">{line.designation}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-700 font-medium">₹{local.basicSalary.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right text-zinc-700 font-medium">₹{local.specialAllowance.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-zinc-900">₹{computedGross.toLocaleString("en-IN")}</td>
                          
                          {/* Meals Deduction */}
                          <td className="px-4 py-3 text-right">
                            {isDraft ? (
                              renderEditableCell(line.employeeId, "meals", local.meals, "w-16")
                            ) : (
                              <span className="text-rose-500">₹{line.meals.toLocaleString("en-IN")}</span>
                            )}
                          </td>

                          {/* LOP Deduction */}
                          <td className="px-4 py-3 text-right">
                            {isDraft ? (
                              renderEditableCell(line.employeeId, "lop", local.lop, "w-20")
                            ) : (
                              <span className="text-rose-600">₹{line.lop.toLocaleString("en-IN")}</span>
                            )}
                          </td>

                          {/* TDS */}
                          <td className="px-4 py-3 text-right">
                            {isDraft ? (
                              renderEditableCell(line.employeeId, "tds", local.tds, "w-16")
                            ) : (
                              <span className="text-rose-400">₹{line.tds.toLocaleString("en-IN")}</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-extrabold text-rose-700">₹{computedDeductions.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-emerald-700">₹{computedNet.toLocaleString("en-IN")}</td>
                          
                          {/* LOP Days */}
                          <td className="px-4 py-3 text-center">
                            {isDraft ? (
                              renderEditableDaysCell(line.employeeId, "lopDays", local.lopDays, "w-12")
                            ) : local.lopDays > 0 ? (
                              <span className="text-orange-600 font-bold">{local.lopDays}d</span>
                            ) : (
                              <span className="text-zinc-300">—</span>
                            )}
                          </td>

                          {/* Leaves YTD */}
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                              {line.totalLeavesTaken ?? 0}d
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-zinc-50 bg-zinc-50/50">
                <p className="text-[10px] text-zinc-400 font-medium">
                  Period: {MONTHS[overview.month - 1]} {overview.year} · {overview.workingDays} working days · Generated by AntBox HRMS
                </p>
              </div>
            </div>
          )}
          {/* ── Tab: History ──────────────────────────────────────── */}
          {activeTab === "history" && (
            <div className="rounded-xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-50">
                <p className="text-sm font-bold text-zinc-900">Payroll Run History</p>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">All past payroll runs</p>
              </div>
              {historyRuns.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-zinc-400">No payroll history yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50/50 border-b border-zinc-100 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                      <tr>
                        <th className="px-6 py-3">Period</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Employees</th>
                        <th className="px-6 py-3">Total Gross</th>
                        <th className="px-6 py-3 text-emerald-700">Net Disbursed</th>
                        <th className="px-6 py-3">Run On</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {historyRuns.map((run) => {
                        const cfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.DRAFT;
                        return (
                          <tr key={run.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-6 py-3 font-bold text-zinc-900">{MONTHS[run.month - 1]} {run.year}</td>
                            <td className="px-6 py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-bold ${cfg.bg} ${cfg.color}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-zinc-600">{run.lineCount ?? "—"}</td>
                            <td className="px-6 py-3 text-zinc-700">{run.totalGross ? `₹${run.totalGross.toLocaleString("en-IN")}` : "—"}</td>
                            <td className="px-6 py-3 font-extrabold text-emerald-700">{run.totalNet ? `₹${run.totalNet.toLocaleString("en-IN")}` : "—"}</td>
                            <td className="px-6 py-3 text-zinc-400">{new Date(run.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                            <td className="px-6 py-3">
                              <button
                                onClick={() => { setMonth(run.month); setYear(run.year); setActiveTab("overview"); }}
                                className="text-[10px] font-bold text-[var(--purple)] hover:underline"
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      {/* Payslip Modal */}
      {mounted && selectedEmployee && (
        <PayslipModal
          line={selectedEmployee}
          month={month}
          year={year}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
