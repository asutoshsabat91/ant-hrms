bash

cat > /mnt/user-data/outputs/AntBox_Antigravity_MetaPrompt.md << 'ENDPROMPT'
# AntBox HRMS — Complete Antigravity Meta-Prompt
## Full surgical instructions for all changes, in exact execution order

---

## CONTEXT — READ THIS FIRST

You are working on **antbox-hrms**, a Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL project. The project is at an intermediate stage — routing, layout, and component shells exist but backend logic is partially wired. The site is deployed via **Google Apps Script** at `https://theantbox.com` (confirmed from the website which links to `script.google.com/macros/s/...`).

**Current project structure** (confirmed from codebase read):
- `app/(dashboard)/` — all pages exist: attendance, calendar, documents, employees, grievances, it-ops, leave, notifications, offboarding, onboarding, payroll, portal, reports, settings
- `components/` — all component shells exist, many partially implemented
- `lib/` — dashboard.ts, attendance.ts, leave.ts, calendar.ts, payroll engine, offboarding automation
- `prisma/schema.prisma` — full schema exists with all models
- `types/index.ts` — NextAuth types extended with `role: Role`
- **Current roles**: SUPER_ADMIN, HR_ADMIN, MANAGER, EMPLOYEE, INTERN

**Target state after this prompt**: Simplified, lighter, production-ready HRMS converted to Google Apps Script (GAS) + Google Sheets as database. Two roles only: ADMIN and EMPLOYEE.

---

## EXECUTION ORDER — FOLLOW THIS EXACTLY

### PHASE 1: DELETIONS (do all deletions before any additions)
### PHASE 2: SIMPLIFICATIONS (role reduction, schema cleanup)
### PHASE 3: DASHBOARD REBUILD (add analytics, embed calendar and offboarding)
### PHASE 4: PAYROLL ENHANCEMENT (Keka/Zoho-inspired)
### PHASE 5: ATTENDANCE LOGIC (missed punch handling)
### PHASE 6: APPS SCRIPT CONVERSION (full rewrite to GAS + Sheets)

---

# PHASE 1 — COMPLETE DELETIONS

## 1.1 — Delete IT Ops entirely

Delete these files completely (do not replace, just delete):
```
app/(dashboard)/it-ops/page.tsx
app/api/it-tasks/route.ts
components/it-ops/ITOpsBoard.tsx
```

Remove the `ITTask`, `ITTaskType`, `ITTaskStatus` models from `prisma/schema.prisma` and remove the `itTasks` relation from the `Employee` model.

Remove the IT Ops onboarding tasks from `prisma/seed.ts` (the tasks with `assignedTo: "IT Admin"` and `category: "IT_SETUP"`). Replace them with HR-assigned documentation tasks instead.

Remove from `lib/automation/offboarding.ts` the task entries:
- "Revoke email access"
- "Disable Slack, Notion, GitHub access"
- "Confirm device return"

Replace those with a single task: `{ title: "Confirm all system access revoked (self-reported by employee)", category: "COMPLIANCE", assignedTo: "HR", dueOffset: 0 }`

## 1.2 — Delete Grievances entirely

Delete these files:
```
app/(dashboard)/grievances/page.tsx
app/api/grievances/route.ts
app/api/grievances/[id]/route.ts
components/grievances/GrievancePortal.tsx
```

Remove from `prisma/schema.prisma`: the `Grievance` model, `GrievanceComment` model, `GrievanceStatus` enum, `GrievancePriority` enum.

Remove from the `User` model: `grievances Grievance[]`

Remove from the `Employee` model: `grievances Grievance[]`

Remove `GRIEVANCE_UPDATE` from the `NotificationType` enum in schema.

In `lib/dashboard.ts`, remove `openGrievances` from `getDashboardStats()`. Remove the `grievances` query from `getRecentActivity()`. Remove all references to `prisma.grievance`.

In `app/(dashboard)/page.tsx`, remove the `openGrievances` stat card and any grievance references.

## 1.3 — Delete Reports page

Delete:
```
app/(dashboard)/reports/page.tsx
app/api/reports/export/route.ts
```

Do NOT delete the report data queries — you will move them to the dashboard in Phase 3.

## 1.4 — Remove from Sidebar and middleware

In `components/layout/Sidebar.tsx`, delete these nav items entirely:
```typescript
{ title: "IT Ops", href: "/it-ops", ... }
{ title: "Grievances", href: "/grievances", ... }
{ title: "Reports", href: "/reports", ... }
```

In `middleware.ts`, remove:
```typescript
"/it-ops": ["HR_ADMIN", "SUPER_ADMIN"],
"/reports": ["HR_ADMIN", "SUPER_ADMIN", "MANAGER"],
```

In `components/dashboard/QuickActions.tsx`, remove the "Grievances" quick action. Replace with:
```typescript
{ label: "Offboard Employee", desc: "Initiate exit process", href: "/offboarding" }
```

---

# PHASE 2 — ROLE SIMPLIFICATION (5 roles → 2 roles)

## 2.1 — Update the Role enum in schema.prisma

Replace:
```prisma
enum Role {
  SUPER_ADMIN
  HR_ADMIN
  MANAGER
  EMPLOYEE
  INTERN
}
```

With:
```prisma
enum Role {
  ADMIN
  EMPLOYEE
}
```

After this change, run: `npx prisma migrate dev --name "simplify_roles"`

## 2.2 — Update seed.ts

Replace all role assignments:
- Any `SUPER_ADMIN` or `HR_ADMIN` → `ADMIN`
- Any `MANAGER`, `EMPLOYEE`, `INTERN` → `EMPLOYEE`

Update the admin seed user:
```typescript
await prisma.user.upsert({
  where: { email: "admin@theantbox.com" },
  create: {
    email: "admin@theantbox.com",
    passwordHash: await bcrypt.hash("AntBox@2025!", 12),
    role: "ADMIN",
    isActive: true,
  },
  update: {},
});
```

## 2.3 — Update types/index.ts

Replace the Role references:
```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: "ADMIN" | "EMPLOYEE";
    };
  }
}
```

## 2.4 — Update Sidebar.tsx — two-role nav

Replace the entire `navItems` array with:

```typescript
const ADMIN_NAV = [
  { title: "Dashboard",    href: "/",             icon: LayoutDashboard },
  { title: "Employees",    href: "/employees",    icon: Users },
  { title: "Onboarding",   href: "/onboarding",   icon: UserPlus },
  { title: "Offboarding",  href: "/offboarding",  icon: UserMinus },
  { title: "Attendance",   href: "/attendance",   icon: Clock },
  { title: "Leave",        href: "/leave",        icon: CalendarDays },
  { title: "Payroll",      href: "/payroll",      icon: Wallet },
  { title: "Documents",    href: "/documents",    icon: FileText },
  { title: "Portal",       href: "/portal",       icon: Briefcase },
  { title: "Settings",     href: "/settings",     icon: Settings },
];

const EMPLOYEE_NAV = [
  { title: "My Dashboard", href: "/",             icon: LayoutDashboard },
  { title: "Attendance",   href: "/attendance",   icon: Clock },
  { title: "Leave",        href: "/leave",        icon: CalendarDays },
  { title: "My Payslips",  href: "/payroll/payslips", icon: Wallet },
  { title: "Documents",    href: "/documents/my", icon: FileText },
  { title: "Reimbursements", href: "/portal/reimbursements", icon: Briefcase },
  { title: "Calendar",     href: "/calendar",     icon: Calendar },
];

// In the component:
const visible = role === "ADMIN" ? ADMIN_NAV : EMPLOYEE_NAV;
```

## 2.5 — Update middleware.ts

Replace the entire `roleRoutes` object:
```typescript
const adminOnlyRoutes = [
  "/employees", "/onboarding", "/offboarding", "/payroll",
  "/documents", "/portal", "/settings", "/api/employees",
  "/api/payroll", "/api/onboarding", "/api/offboarding",
];

// In middleware: if any admin-only route is hit by EMPLOYEE role, redirect to /
```

## 2.6 — Update all role checks in every file

Do a global find-and-replace across the entire project:
- `role === "HR_ADMIN" || role === "SUPER_ADMIN"` → `role === "ADMIN"`
- `role === "SUPER_ADMIN"` → `role === "ADMIN"`
- `role === "HR_ADMIN"` → `role === "ADMIN"`
- `role === "MANAGER"` → `role === "EMPLOYEE"` (managers become employees in this simplified model)
- `["HR_ADMIN", "SUPER_ADMIN"]` → `["ADMIN"]`
- `["HR_ADMIN", "SUPER_ADMIN", "MANAGER"]` → `["ADMIN"]`

In the leave system: remove all MANAGER approval logic. ADMIN approves all leaves.
In the attendance system: only ADMIN sees the team table.

---

# PHASE 3 — DASHBOARD REBUILD WITH ANALYTICS + EMBEDDED SECTIONS

## 3.1 — Move Reports data into Dashboard

In `app/(dashboard)/page.tsx`, add these additional data fetches to the existing `Promise.all`:

```typescript
// Add to the try block in DashboardPage:
const [
  stats,
  activity,
  onboardingHires,
  // NEW analytics data
  deptStats,
  leaveStats,
  payrollSummary,
  upcomingOffboarding,
  pendingLeaves,
  reimbursementStats,
] = await Promise.all([
  getDashboardStats(),
  getRecentActivity(),
  prisma.employee.findMany({ where: { status: "ONBOARDING" }, orderBy: { createdAt: "desc" }, take: 4 }),
  
  // Department headcount
  prisma.department.findMany({
    include: {
      employees: {
        where: { status: { in: ["ACTIVE", "ONBOARDING"] } },
        select: { ctc: true, gender: true },
      },
    },
  }),
  
  // Leave stats
  prisma.leaveRequest.groupBy({ by: ["status"], _count: { id: true } }),
  
  // Latest payroll run
  prisma.payrollRun.findFirst({ orderBy: { createdAt: "desc" } }),
  
  // Employees going offboard in next 30 days
  prisma.employee.findMany({
    where: {
      status: "OFFBOARDING",
      lastWorkingDate: { gte: new Date(), lte: addDays(new Date(), 30) },
    },
    select: { id: true, firstName: true, lastName: true, lastWorkingDate: true, designation: true },
    orderBy: { lastWorkingDate: "asc" },
    take: 5,
  }),
  
  // Pending leave requests count
  prisma.leaveRequest.count({ where: { status: "PENDING" } }),
  
  // Reimbursement stats
  prisma.reimbursement.groupBy({ by: ["status"], _sum: { amount: true }, _count: { id: true } }),
]);
```

## 3.2 — New Analytics Section in Dashboard

After the existing stat cards row in `app/(dashboard)/page.tsx`, add a new "Analytics" section with this exact layout:

```
ROW 1: [Headcount by Dept bar chart] [Leave Stats donut] [Payroll Summary card]
ROW 2: [Upcoming Offboarding mini-list] [Pending Leaves action list] [Reimbursements pending]
ROW 3: [Company Calendar — embedded, compact] [Attendance Pulse Chart — already exists]
```

### Analytics Row 1: Department Headcount Bar Chart

Create `components/dashboard/DeptHeadcountChart.tsx`:

```typescript
"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DeptData { name: string; headcount: number; avgCtc: number; }

export function DeptHeadcountChart({ data }: { data: DeptData[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Headcount by Department</p>
      <p className="text-2xl font-extrabold text-zinc-900 mb-4">
        {data.reduce((s, d) => s + d.headcount, 0)} <span className="text-sm font-medium text-zinc-400">total</span>
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e4e4e7" }}
            formatter={(v: number) => [`${v} people`, "Headcount"]}
          />
          <Bar dataKey="headcount" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? "var(--purple)" : "#e4e4e7"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Analytics Row 1: Leave Stats Donut

Create `components/dashboard/LeaveStatsChart.tsx`:

```typescript
"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface LeaveStatItem { status: string; count: number; }

const COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  APPROVED: "#22C55E",
  REJECTED: "#EF4444",
  CANCELLED: "#A1A1AA",
};

export function LeaveStatsChart({ data }: { data: LeaveStatItem[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Leave Overview</p>
      <p className="text-2xl font-extrabold text-zinc-900 mb-2">
        {total} <span className="text-sm font-medium text-zinc-400">requests</span>
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={40} outerRadius={60}>
            {data.map((entry, i) => (
              <Cell key={i} fill={COLORS[entry.status] || "#6366F1"} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number, name: string) => [v, name.toLowerCase()]} contentStyle={{ fontSize: 11 }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Analytics Row 1: Payroll Summary Card

Create `components/dashboard/PayrollSummaryCard.tsx`:

```typescript
import { IndianRupee, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface PayrollRun { status: string; month: number; year: number; totalNet?: number | null; totalGross?: number | null; }

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function PayrollSummaryCard({ run }: { run: PayrollRun | null }) {
  if (!run) return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-5 flex flex-col justify-between">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Payroll</p>
      <div className="flex flex-col items-center justify-center h-24 gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-400" />
        <p className="text-xs text-zinc-400">No payroll run yet this month</p>
        <Link href="/payroll" className="text-xs font-semibold text-[var(--purple)] hover:underline">Run payroll →</Link>
      </div>
    </div>
  );

  const statusIcon = run.status === "PAID" ? CheckCircle2 : Clock;
  const StatusIcon = statusIcon;
  const statusColor = run.status === "PAID" ? "text-emerald-600" : "text-amber-600";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Payroll</p>
      <p className="text-sm font-semibold text-zinc-700">{MONTH_NAMES[run.month - 1]} {run.year}</p>
      <div className={`flex items-center gap-1.5 mt-1 mb-3 ${statusColor}`}>
        <StatusIcon className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">{run.status}</span>
      </div>
      {run.totalNet && (
        <div>
          <p className="text-xs text-zinc-400">Net disbursed</p>
          <p className="text-xl font-extrabold text-zinc-900 flex items-center gap-0.5">
            <IndianRupee className="h-4 w-4 text-zinc-500" />
            {run.totalNet.toLocaleString("en-IN")}
          </p>
        </div>
      )}
      <Link href="/payroll" className="text-xs font-semibold text-[var(--purple)] hover:underline mt-3 block">View details →</Link>
    </div>
  );
}
```

### Analytics Row 2: Upcoming Offboarding Widget

Create `components/dashboard/UpcomingOffboardingWidget.tsx`:

```typescript
import Link from "next/link";
import { UserMinus, CalendarDays } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface OffboardingEmployee {
  id: string; firstName: string; lastName: string;
  lastWorkingDate: string | Date | null; designation: string;
}

export function UpcomingOffboardingWidget({ employees }: { employees: OffboardingEmployee[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Upcoming Exits</p>
        <Link href="/offboarding" className="text-[10px] font-semibold text-[var(--purple)]">View all →</Link>
      </div>
      {employees.length === 0 ? (
        <p className="text-xs text-zinc-400 py-4 text-center">No upcoming exits in 30 days</p>
      ) : (
        <div className="space-y-2.5">
          {employees.map((emp) => {
            const daysLeft = emp.lastWorkingDate
              ? differenceInDays(new Date(emp.lastWorkingDate), new Date())
              : null;
            return (
              <Link key={emp.id} href={`/offboarding/${emp.id}`} className="flex items-center justify-between hover:bg-zinc-50 rounded-lg p-1.5 -mx-1.5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                    <UserMinus className="h-3.5 w-3.5 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">{emp.firstName} {emp.lastName}</p>
                    <p className="text-[10px] text-zinc-400">{emp.designation}</p>
                  </div>
                </div>
                {daysLeft !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    daysLeft <= 3 ? "bg-rose-50 text-rose-600" :
                    daysLeft <= 7 ? "bg-amber-50 text-amber-600" :
                    "bg-zinc-50 text-zinc-500"
                  }`}>
                    {daysLeft === 0 ? "Today" : `${daysLeft}d`}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### Analytics Row 2: Pending Leave Approvals Widget (Admin only)

Create `components/dashboard/PendingLeavesWidget.tsx`:

```typescript
import Link from "next/link";
import { CalendarDays } from "lucide-react";

interface PendingLeave {
  id: string;
  employee: { firstName: string; lastName: string; employeeId: string };
  leaveType: { name: string };
  days: number;
  startDate: string | Date;
}

export function PendingLeavesWidget({ leaves, count }: { leaves: PendingLeave[]; count: number }) {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
          Pending Leaves
          {count > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold">{count}</span>
          )}
        </p>
        <Link href="/leave?tab=approvals" className="text-[10px] font-semibold text-amber-700">Review all →</Link>
      </div>
      {leaves.length === 0 ? (
        <p className="text-xs text-amber-600/60 py-2 text-center">No pending approvals</p>
      ) : (
        <div className="space-y-2">
          {leaves.map((leave) => (
            <div key={leave.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
              <div>
                <p className="text-xs font-semibold text-zinc-800">{leave.employee.firstName} {leave.employee.lastName}</p>
                <p className="text-[10px] text-zinc-400">{leave.leaveType.name} · {leave.days}d</p>
              </div>
              <Link href={`/leave?id=${leave.id}`} className="text-[10px] font-bold text-[var(--purple)] hover:underline">Review →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Analytics Row 3: Embedded Compact Calendar on Dashboard

In `app/(dashboard)/page.tsx`, add a compact calendar section. Import `CompanyCalendar` but wrap it:

```typescript
// Add this section at the bottom of the dashboard, full-width
<ScrollReveal className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
  <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
    <div>
      <p className="text-sm font-bold text-zinc-900">Company Calendar</p>
      <p className="text-xs text-zinc-400 mt-0.5">Holidays, team events, and leave overview</p>
    </div>
    <Link href="/calendar" className="text-xs font-semibold text-[var(--purple)]">Open full calendar →</Link>
  </div>
  <div className="p-4">
    <CompanyCalendar canManage={role === "ADMIN"} compact={true} />
  </div>
</ScrollReveal>
```

Add a `compact` prop to `CompanyCalendar.tsx`:
- When `compact={true}`, render in week view by default, height 300px, hide the toolbar title, show only the next 7 days
- When an employee clicks a date in compact mode, it opens the leave apply dialog pre-filled with that date

## 3.3 — Employee Dashboard (separate view for EMPLOYEE role)

In `app/(dashboard)/page.tsx`, check the role and show different dashboards:

```typescript
const session = await auth();
const isAdmin = session?.user?.role === "ADMIN";

if (!isAdmin) {
  // Employee dashboard: personal stats only
  return <EmployeeDashboard session={session} />;
}
// Admin dashboard: full analytics
```

Create `components/dashboard/EmployeeDashboard.tsx` with:
1. Personal greeting: "Good morning, [Name]"
2. Clock widget (prominent — punch in/out)
3. Personal leave balance cards (4 leave types)
4. Last 3 payslips with download buttons
5. Compact calendar (read-only, shows approved leaves highlighted)
6. Any pending onboarding tasks (if status is ONBOARDING)
7. Quick links: Apply Leave, Submit Reimbursement, Download Documents

---

# PHASE 4 — PAYROLL SECTION ENHANCEMENT (Keka/Zoho-inspired)

## 4.1 — What the Keka screenshot shows (reference)

The Keka payroll UI shows: Employee ID, Employee Name, Earnings (with change %), Taxes, Reimbursements, Benefits, Post-tax deductions, Net Pay, Payment Method — in a clean table with tabs for "All employees / Exit employees / New employees". Progress indicator at top: Salaried → Contractor → Review & confirm. Run metadata: "Employees 200 | Run by 29 Jun | Pay day 31 Jun".

## 4.2 — Enhance `components/payroll/ComprehensivePayrollDashboard.tsx`

The current component exists but needs these additions. Do NOT rewrite from scratch — add to the existing structure:

### Addition 1: Run Payroll Wizard (3-step stepper)

Add a "Run Payroll" button that opens a wizard modal with 3 steps:

```
Step 1 — Select Period
  [ Month selector ] [ Year selector ]
  Working days this month: [auto-calculated, editable]
  Include: [✓] Active employees  [✓] Interns  [ ] Contractors
  Pay date: [date picker]
  [ Next: Preview → ]

Step 2 — Preview & Adjust
  Tab bar: [ All Employees | New Joiners | Exiting ]
  Run metadata bar: "Employees: 73 | Run by: [HR Name] | Pay day: 30 Jun 2026"
  
  Sortable table columns:
  Emp ID | Name + Designation | Gross Earnings | PF | ESI | Prof Tax | TDS | LOP Days | Net Pay | Status
  
  Each row is editable (inline edit for bonus, overtime)
  Search + filter by department/status
  Bulk actions: [Select all] [Export preview CSV]
  
  [ ← Back ] [ Approve & Generate Payslips → ]

Step 3 — Confirm & Send
  Summary cards: Total gross ₹XX,XX,XXX | Total deductions ₹X,XX,XXX | Net payable ₹XX,XX,XXX
  Employee count: 73 payslips
  Checkbox: [✓] Email payslips to employees automatically
  Checkbox: [✓] Mark attendance LOP days
  [ ← Back ] [ ✓ Run Payroll & Send Payslips ]
```

### Addition 2: Employee Detail Payslip Modal

In the payroll table, clicking an employee row opens a modal with:
```
┌─────────────────────────────────────────────────────┐
│ PAYSLIP                          AntBox              │
│ April 2026                       Bhubaneswar, Odisha │
├────────────────────┬────────────────────────────────┤
│ Employee: Priya S  │ Employee ID: ANT-023            │
│ Designation: SDE   │ Department: Engineering         │
│ Bank: HDFC ****3421│ PAN: AAAPX****                  │
│ Working Days: 26   │ Paid Days: 24 | LOP: 2          │
├────────────────────┴────────────────────────────────┤
│ EARNINGS           ₹        DEDUCTIONS          ₹   │
│ Basic Salary   25,000        PF (12%)       3,000    │
│ HRA            12,500        ESI (0.75%)      0      │
│ Special Allow  12,500        Prof Tax         200    │
│ Overtime           0         TDS              0      │
│ Bonus              0         LOP Deduction 1,923     │
│ ─────────────────────────────────────────────────── │
│ Gross Earnings 50,000        Total Deductions 5,123  │
├─────────────────────────────────────────────────────┤
│           NET PAY: ₹44,877                          │
│     Forty-four thousand eight hundred seventy-seven │
├─────────────────────────────────────────────────────┤
│ Leaves This Month: CL: 1 used | SL: 0 | PL: 1 used │
└─────────────────────────────────────────────────────┘
[ Print ] [ Download PDF ] [ Email to Employee ]
```

### Addition 3: Payroll History Tab

Add a "History" tab to the payroll dashboard showing past runs:
```
Month        | Status   | Employees | Total Net   | Run By    | Sent
May 2026     | PAID     | 72        | ₹32,45,600  | Admin     | 30 May
Apr 2026     | PAID     | 70        | ₹31,80,000  | Admin     | 30 Apr
```

### Addition 4: Salary Structure in Employee Profile

In `app/(dashboard)/employees/[id]/page.tsx`, add a "Compensation" tab:
```
CTC (Annual):     ₹6,00,000  [Edit]
Basic (40%):      ₹20,000/month
HRA (50% of basic): ₹10,000/month
Special Allow:    ₹20,000/month
─────────────────────────────
Gross Monthly:    ₹50,000

Deductions:
PF (Employee 12%): ₹2,400
PF (Employer 12%): ₹2,400 [company pays]
ESI: ₹0 (above ₹21,000 threshold)
Professional Tax: ₹200
─────────────────────────────
Net Monthly: ₹47,400
```

### Addition 5: Fix payroll API to auto-calculate from attendance

In `app/api/payroll/route.ts`, when running payroll, the LOP days should be calculated by:
1. Get all `AttendanceRecord` for the employee in the month
2. Count days with status NOT IN ["PRESENT", "ON_LEAVE", "HOLIDAY", "WFH"]
3. That count = LOP days
4. `paidDays = totalWorkingDays - lopDays`
5. Use the existing `calculatePayroll()` from `lib/utils/payrollEngine.ts`

---

# PHASE 5 — ATTENDANCE: MISSED PUNCH LOGIC

## 5.1 — The Problem
Employees forget to punch in or punch out. Currently the system would mark them absent. Need a grace system.

## 5.2 — Backend Logic

In `app/api/attendance/route.ts`, in the POST handler (punch action), add this logic:

### Missed Punch-In Detection
When an employee punches OUT but has no open punch-IN for today:
```typescript
// If trying to PUNCH_OUT but no open punch-in exists:
if (action === "PUNCH_OUT" && lastPunch?.punchType !== "IN") {
  // Auto-create a punch-in at office start time (9:00 AM IST today)
  const assumedPunchIn = new Date(todayStart());
  assumedPunchIn.setUTCHours(3, 30, 0, 0); // 9:00 AM IST = 03:30 UTC
  
  await prisma.attendancePunch.create({
    data: {
      recordId: record.id,
      punchType: "IN",
      punchedAt: assumedPunchIn,
      isAssumed: true,   // NEW FIELD — add to schema
      assumedReason: "AUTO: No punch-in found. Defaulted to 9:00 AM.",
    }
  });
  
  // Also create a notification for the employee
  await createNotification({
    userId: session.user.id,
    type: "ATTENDANCE_ALERT",
    title: "Punch-in assumed",
    body: "We couldn't find your punch-in today. Your start time has been set to 9:00 AM. Please contact HR if this is incorrect.",
    link: "/attendance",
  });
}
```

### Missed Punch-Out Detection (Cron job / daily)
Create `app/api/cron/fix-incomplete-attendance/route.ts`:

```typescript
export async function GET(req: NextRequest) {
  // Auth check with CRON_SECRET
  
  // Find all AttendanceRecords from yesterday with status INCOMPLETE
  // (i.e., last punch was IN, no corresponding OUT)
  const yesterday = getPreviousWorkday();
  
  const incompleteRecords = await prisma.attendanceRecord.findMany({
    where: {
      workDate: yesterday,
      status: "INCOMPLETE",
    },
    include: { punches: { orderBy: { punchedAt: "asc" } }, employee: { include: { user: true } } }
  });
  
  for (const record of incompleteRecords) {
    const lastPunch = record.punches.at(-1);
    if (lastPunch?.punchType !== "IN") continue;
    
    // Assume punch-out at 6:00 PM (18:00 IST = 12:30 UTC)
    const assumedPunchOut = new Date(yesterday);
    assumedPunchOut.setUTCHours(12, 30, 0, 0); // 6:00 PM IST
    
    // Ensure assumed out is after the last punch in
    const effectiveOut = assumedPunchOut > lastPunch.punchedAt
      ? assumedPunchOut
      : new Date(lastPunch.punchedAt.getTime() + 30 * 60 * 1000); // +30 min if overlap
    
    await prisma.$transaction(async (tx) => {
      // Create assumed punch-out
      await tx.attendancePunch.create({
        data: {
          recordId: record.id,
          punchType: "OUT",
          punchedAt: effectiveOut,
          isAssumed: true,
          assumedReason: "AUTO: No punch-out found. Defaulted to 6:00 PM.",
        }
      });
      
      // Recalculate total hours
      const allPunches = await tx.attendancePunch.findMany({
        where: { recordId: record.id },
        orderBy: { punchedAt: "asc" }
      });
      const totalHours = sumWorkedHours(allPunches);
      
      // Update record status
      await tx.attendanceRecord.update({
        where: { id: record.id },
        data: {
          status: totalHours >= 4 ? "PRESENT" : "HALF_DAY",
          totalHours,
        }
      });
    });
    
    // Notify employee
    await createNotification({
      userId: record.employee.userId,
      type: "ATTENDANCE_ALERT",
      title: "Punch-out assumed for yesterday",
      body: `You forgot to punch out on ${format(yesterday, 'dd MMM')}. Your end time was set to 6:00 PM. Total hours: ${formatHours(newTotalHours)}. Contact HR if incorrect.`,
      link: "/attendance",
    });
    
    // Notify Admin
    await notifyAdmin("ATTENDANCE_ALERT", {
      title: `Assumed attendance: ${record.employee.firstName} ${record.employee.lastName}`,
      body: `${record.employee.firstName}'s punch-out was missing on ${format(yesterday, 'dd MMM')}. Auto-set to 6:00 PM.`,
    });
  }
  
  return NextResponse.json({ fixed: incompleteRecords.length });
}
```

### Schema addition for isAssumed flag

Add to the `AttendancePunch` model in `prisma/schema.prisma`:
```prisma
model AttendancePunch {
  // ... existing fields ...
  isAssumed     Boolean  @default(false)
  assumedReason String?
}
```

### UI: Show assumed punches differently

In `components/attendance/AttendancePunchControls.tsx`, when rendering the punch timeline:
```typescript
// If punch.isAssumed === true, show with amber color and a ⚠ icon
<div className={cn(
  "flex items-center justify-between py-1.5 px-3 rounded-lg",
  punch.isAssumed ? "bg-amber-50 border border-amber-200" : "bg-zinc-50"
)}>
  {punch.isAssumed && <AlertTriangle className="h-3 w-3 text-amber-500 mr-1" />}
  ...
</div>
```

Also add a banner if today's record has any assumed punches:
```typescript
{payload?.punches.some(p => p.isAssumed) && (
  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2 items-start">
    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-xs font-semibold text-amber-800">Assumed punch detected</p>
      <p className="text-xs text-amber-600 mt-0.5">One or more punches were auto-filled. Contact HR if incorrect.</p>
    </div>
  </div>
)}
```

### GitHub Actions cron for fix-incomplete-attendance

Add to `.github/workflows/daily-cron.yml`:
```yaml
- name: Fix incomplete attendance (10 PM IST = 16:30 UTC)
  run: |
    curl -X GET \
      -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
      "${{ secrets.APP_URL }}/api/cron/fix-incomplete-attendance"
```

---

# PHASE 6 — GOOGLE APPS SCRIPT CONVERSION

## 6.1 — Understanding the current deployment

The AntBox website (`theantbox.com`) already links to Google Apps Script:
`https://script.google.com/macros/s/AKfycbz2OgAgve1LTWsuWpEmb5ChyvA1ZnI84nL5ak6hB10CtpB04Sts6hDsUWg0Tg0PxwSL-A/exec`

This means the HRMS should be converted to a **GAS Web App** with **Google Sheets as the database**. This entirely removes the need for PostgreSQL, Prisma, Neon, Render, Vercel — zero infrastructure cost.

## 6.2 — Architecture of the GAS HRMS

```
Google Drive (free storage)
└── AntBox HRMS Spreadsheet (Google Sheets)
    ├── Sheet: Users          (id, email, passwordHash, role, isActive)
    ├── Sheet: Employees      (id, userId, firstName, lastName, email, employeeId, designation, departmentId, managerId, employmentType, status, joiningDate, basicSalary, hra, specialAllowance, professionalTax, pan, bankAccountNo, ifscCode, bankName, phone, address, ctc, ...)
    ├── Sheet: Departments    (id, name, code)
    ├── Sheet: AttendanceRecords (id, employeeId, workDate, totalHours, status)
    ├── Sheet: AttendancePunches (id, recordId, employeeId, punchType, punchedAt, isAssumed, assumedReason)
    ├── Sheet: LeaveTypes     (id, name, code, daysPerYear, carryoverLimit, isPaid)
    ├── Sheet: LeaveBalances  (id, employeeId, leaveTypeId, year, allocated, used, pending)
    ├── Sheet: LeaveRequests  (id, employeeId, leaveTypeId, startDate, endDate, days, reason, status, approverId, approvedAt)
    ├── Sheet: PayrollRuns    (id, month, year, status, createdBy, periodStart, periodEnd, totalGross, totalNet)
    ├── Sheet: PayrollLines   (id, runId, employeeId, basicSalary, hra, specialAllowance, grossEarnings, pf, esi, professionalTax, tds, lop, totalDeductions, netPay, paidDays, lopDays, payslipSentAt)
    ├── Sheet: Documents      (id, employeeId, type, title, fileUrl, issuedDate, issuedBy)
    ├── Sheet: OnboardingTasks (id, employeeId, title, category, assignedTo, dueDate, status, order)
    ├── Sheet: OffboardingTasks (id, employeeId, title, category, assignedTo, dueDate, status, order)
    ├── Sheet: Notifications  (id, userId, type, title, body, link, isRead, createdAt)
    ├── Sheet: Reimbursements (id, employeeId, title, category, amount, date, status, approverId)
    ├── Sheet: Holidays       (id, name, date, type)
    └── Sheet: CompanyEvents  (id, title, startDate, endDate, allDay, category, createdBy)

Google Apps Script Web App
└── Code.gs (main router)
└── Auth.gs (login, session tokens)
└── DB.gs (CRUD helpers for Sheets)
└── Employees.gs
└── Attendance.gs
└── Leave.gs
└── Payroll.gs
└── Documents.gs
└── Onboarding.gs
└── Offboarding.gs
└── Notifications.gs
└── Email.gs (Gmail API)
└── frontend/ (HTML files served as HtmlService)
    └── index.html (SPA shell)
    └── login.html
    └── dashboard.html
    └── attendance.html
    └── leave.html
    └── payroll.html
    └── employees.html
    └── onboarding.html
    └── offboarding.html
    └── documents.html
    └── portal.html
    └── calendar.html
    └── settings.html
```

## 6.3 — Core Code.gs (Router)

```javascript
// Code.gs — Main entry point

function doGet(e) {
  const page = e.parameter.page || 'login';
  
  // Check session
  const token = e.parameter.token;
  const session = token ? validateSession(token) : null;
  
  if (!session && page !== 'login') {
    return HtmlService.createHtmlOutputFromFile('login')
      .setTitle('AntBox HRMS — Login')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  const template = HtmlService.createTemplateFromFile('index');
  template.page = page;
  template.user = session ? JSON.stringify(session.user) : 'null';
  template.token = token || '';
  
  return template.evaluate()
    .setTitle('AntBox HRMS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const action = body.action;
  const token = body.token;
  
  // Validate session for all non-auth actions
  const session = action.startsWith('auth.') ? null : validateSession(token);
  if (!session && !action.startsWith('auth.')) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'Unauthorized' })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  
  let result;
  try {
    switch (action) {
      // Auth
      case 'auth.login':           result = login(body.email, body.password); break;
      case 'auth.logout':          result = logout(token); break;
      
      // Employees
      case 'employees.list':       result = listEmployees(session); break;
      case 'employees.get':        result = getEmployee(body.id); break;
      case 'employees.create':     result = createEmployee(body.data, session); break;
      case 'employees.update':     result = updateEmployee(body.id, body.data, session); break;
      
      // Attendance
      case 'attendance.punch':     result = punch(body.punchType, session); break;
      case 'attendance.today':     result = getTodayAttendance(session); break;
      case 'attendance.report':    result = getAttendanceReport(body.month, body.year, body.employeeId, session); break;
      
      // Leave
      case 'leave.request':        result = createLeaveRequest(body.data, session); break;
      case 'leave.list':           result = listLeaveRequests(session); break;
      case 'leave.approve':        result = approveLeave(body.id, session); break;
      case 'leave.reject':         result = rejectLeave(body.id, body.reason, session); break;
      case 'leave.balances':       result = getLeaveBalances(session); break;
      
      // Payroll
      case 'payroll.run':          result = runPayroll(body.month, body.year, session); break;
      case 'payroll.list':         result = listPayrollRuns(session); break;
      case 'payroll.lines':        result = getPayrollLines(body.runId, session); break;
      case 'payroll.sendPayslips': result = sendAllPayslips(body.runId, session); break;
      case 'payroll.myPayslips':   result = getMyPayslips(session); break;
      
      // Documents
      case 'documents.generate':   result = generateDocument(body.data, session); break;
      case 'documents.list':       result = listDocuments(body.employeeId, session); break;
      
      // Onboarding
      case 'onboarding.initiate':  result = initiateOnboarding(body.employeeId, session); break;
      case 'onboarding.tasks':     result = getOnboardingTasks(body.employeeId, session); break;
      case 'onboarding.updateTask': result = updateOnboardingTask(body.taskId, body.status, session); break;
      
      // Offboarding
      case 'offboarding.initiate': result = initiateOffboarding(body.data, session); break;
      case 'offboarding.tasks':    result = getOffboardingTasks(body.employeeId, session); break;
      case 'offboarding.updateTask': result = updateOffboardingTask(body.taskId, body.status, session); break;
      
      // Notifications
      case 'notifications.list':   result = getNotifications(session); break;
      case 'notifications.read':   result = markRead(body.id, session); break;
      
      // Reimbursements
      case 'reimbursements.create': result = createReimbursement(body.data, session); break;
      case 'reimbursements.list':   result = listReimbursements(session); break;
      case 'reimbursements.approve': result = approveReimbursement(body.id, session); break;
      
      // Calendar
      case 'calendar.events':      result = getCalendarEvents(session); break;
      case 'calendar.create':      result = createCalendarEvent(body.data, session); break;
      
      // Dashboard
      case 'dashboard.stats':      result = getDashboardStats(session); break;
      
      // Settings
      case 'settings.departments': result = listDepartments(); break;
      case 'settings.leaveTypes':  result = listLeaveTypes(); break;
      
      default: result = { success: false, error: `Unknown action: ${action}` };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
    Logger.log(`Error in action ${action}: ${err}`);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Include HTML partials
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

## 6.4 — DB.gs (Google Sheets CRUD layer)

```javascript
// DB.gs — All Google Sheets database operations

const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function getAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function findRows(sheetName, filterFn) {
  return getAllRows(sheetName).filter(filterFn);
}

function findOne(sheetName, filterFn) {
  return getAllRows(sheetName).find(filterFn) || null;
}

function insertRow(sheetName, data) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (headers.every(h => h === '')) {
    // Sheet is empty — write headers from data keys
    const keys = Object.keys(data);
    sheet.appendRow(keys);
    headers.push(...keys);
  }
  
  const row = headers.map(h => data[h] !== undefined ? data[h] : '');
  sheet.appendRow(row);
  return data;
}

function updateRow(sheetName, idValue, updates) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === idValue) {
      Object.keys(updates).forEach(key => {
        const col = headers.indexOf(key);
        if (col !== -1) {
          sheet.getRange(i + 1, col + 1).setValue(updates[key]);
        }
      });
      return true;
    }
  }
  return false;
}

function deleteRow(sheetName, idValue) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === idValue) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function generateId() {
  return Utilities.getUuid();
}

function now() {
  return new Date().toISOString();
}
```

## 6.5 — Auth.gs (Login + Sessions)

```javascript
// Auth.gs — Authentication using Google Sheets + bcrypt-compatible check

function login(email, password) {
  const user = findOne('Users', u => u.email === email && u.isActive === true);
  if (!user) return { success: false, error: 'Invalid email or password' };
  
  // Compare password (stored as SHA-256 hash for GAS — bcrypt not available)
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  
  if (hash !== user.passwordHash) return { success: false, error: 'Invalid email or password' };
  
  // Create session token
  const token = Utilities.getUuid();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  
  insertRow('Sessions', {
    id: generateId(),
    userId: user.id,
    token,
    expiresAt,
    createdAt: now(),
  });
  
  const employee = findOne('Employees', e => e.userId === user.id);
  
  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: employee ? `${employee.firstName} ${employee.lastName}` : user.email,
      employeeId: employee?.id || null,
    }
  };
}

function validateSession(token) {
  if (!token) return null;
  const session = findOne('Sessions', s => s.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;
  
  const user = findOne('Users', u => u.id === session.userId);
  if (!user || !user.isActive) return null;
  
  const employee = findOne('Employees', e => e.userId === user.id);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: employee ? `${employee.firstName} ${employee.lastName}` : user.email,
      employeeId: employee?.id || null,
    }
  };
}

function logout(token) {
  deleteRow('Sessions', findOne('Sessions', s => s.token === token)?.id);
  return { success: true };
}
```

## 6.6 — Email.gs (Gmail-based email automation)

```javascript
// Email.gs — All email sending via Gmail API (free, uses the connected Google account)

function sendWelcomeEmail(employee, tempPassword) {
  const subject = `Welcome to AntBox! 🐜 Your account is ready`;
  const body = `
Hi ${employee.firstName},

Welcome to AntBox! We're excited to have you join us as ${employee.designation}.

Your login credentials:
Email: ${employee.email}
Temporary Password: ${tempPassword}

Please log in at: ${getAppUrl()}

Your onboarding tasks are ready and waiting for you.

Regards,
AntBox People Team
people@theantbox.com
  `;
  GmailApp.sendEmail(employee.email, subject, body);
}

function sendOffboardingNotification(employee, lastWorkingDate, requiredDocuments) {
  const subject = `Your offboarding process has begun — Action Required`;
  const docList = requiredDocuments.map(d => `• ${d}`).join('\n');
  const body = `
Hi ${employee.firstName},

Your offboarding process has been initiated. Your last working day is: ${lastWorkingDate}.

Please submit the following documents before your last working day:
${docList}

Log in to the HRMS portal to track your offboarding checklist: ${getAppUrl()}

For any queries, please reach out to people@theantbox.com.

Regards,
AntBox People Team
  `;
  GmailApp.sendEmail(employee.email, subject, body);
  
  // Also send to employee's personal email if different
  if (employee.personalEmail && employee.personalEmail !== employee.email) {
    GmailApp.sendEmail(employee.personalEmail, subject, body);
  }
}

function sendPayslipEmail(employee, month, year, netPay, payslipContent) {
  // Create a Google Doc as the payslip, then email the link
  const docName = `AntBox_Payslip_${employee.employeeId}_${year}-${month}`;
  const doc = DocumentApp.create(docName);
  const body = doc.getBody();
  
  // Write payslip content to Google Doc
  body.insertParagraph(0, payslipContent);
  doc.saveAndClose();
  
  // Move to employee's folder in Drive
  const file = DriveApp.getFileById(doc.getId());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const payslipUrl = file.getUrl();
  
  // Store URL in sheet
  updateRow('PayrollLines', /* lineId */, { payslipUrl, payslipSentAt: now() });
  
  GmailApp.sendEmail(
    employee.personalEmail || employee.email,
    `Your AntBox Payslip — ${MONTH_NAMES[month-1]} ${year}`,
    `Hi ${employee.firstName},\n\nYour payslip for ${MONTH_NAMES[month-1]} ${year} is ready.\n\nNet Pay: ₹${netPay.toLocaleString('en-IN')}\n\nView your payslip: ${payslipUrl}\n\nRegards,\nAntBox People Team\npeople@theantbox.com`
  );
}

function sendLeaveApprovalEmail(employee, leaveRequest, approved, reason) {
  const status = approved ? 'Approved ✅' : 'Rejected ❌';
  const subject = `Leave Request ${status} — AntBox`;
  const body = `
Hi ${employee.firstName},

Your leave request has been ${approved ? 'approved' : 'rejected'}.

Details:
Type: ${leaveRequest.leaveTypeName}
From: ${leaveRequest.startDate}
To: ${leaveRequest.endDate}
Days: ${leaveRequest.days}
${!approved && reason ? `Reason for rejection: ${reason}` : ''}

Log in to the portal for more details: ${getAppUrl()}

Regards,
AntBox People Team
  `;
  GmailApp.sendEmail(employee.email, subject, body);
}

function sendNotificationEmail(userId, title, body) {
  const user = findOne('Users', u => u.id === userId);
  if (!user) return;
  GmailApp.sendEmail(user.email, `AntBox: ${title}`, body);
}

function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
```

## 6.7 — Offboarding.gs (with Gmail automation trigger)

```javascript
// Offboarding.gs

function initiateOffboarding(data, session) {
  if (session.user.role !== 'ADMIN') throw new Error('Forbidden');
  
  const { employeeId, lastWorkingDate, reason, letters, exitInterviewDate } = data;
  const employee = findOne('Employees', e => e.id === employeeId);
  if (!employee) throw new Error('Employee not found');
  
  // Update employee status
  updateRow('Employees', employeeId, {
    status: 'OFFBOARDING',
    lastWorkingDate,
  });
  
  // Determine required documents from letters selection
  const requiredDocuments = [];
  if (letters.includes('Relieving Letter')) requiredDocuments.push('Relieving Letter');
  if (letters.includes('Experience Letter')) requiredDocuments.push('Experience Letter');
  if (letters.includes('LOR')) requiredDocuments.push('Letter of Recommendation');
  requiredDocuments.push('Submit knowledge transfer document');
  requiredDocuments.push('Return all company assets/devices');
  requiredDocuments.push('Confirm all pending reimbursements submitted');
  
  // Create offboarding tasks in sheet
  const tasks = [
    { title: 'Complete exit interview', assignedTo: 'HR', dueOffset: -2 },
    { title: 'Submit knowledge transfer document', assignedTo: 'Employee', dueOffset: -2 },
    { title: 'Return all company assets', assignedTo: 'Employee', dueOffset: 0 },
    { title: 'Settle pending reimbursements', assignedTo: 'Finance', dueOffset: 0 },
    ...letters.includes('Relieving Letter') ? [{ title: 'Generate relieving letter', assignedTo: 'HR', dueOffset: 1 }] : [],
    ...letters.includes('Experience Letter') ? [{ title: 'Generate experience letter', assignedTo: 'HR', dueOffset: 1 }] : [],
    { title: 'Final payslip generation', assignedTo: 'HR', dueOffset: 7 },
    { title: 'Update employee status to ALUMNI', assignedTo: 'HR', dueOffset: 1 },
  ];
  
  const lwd = new Date(lastWorkingDate);
  tasks.forEach((task, idx) => {
    const dueDate = new Date(lwd);
    dueDate.setDate(dueDate.getDate() + task.dueOffset);
    
    insertRow('OffboardingTasks', {
      id: generateId(),
      employeeId,
      title: task.title,
      assignedTo: task.assignedTo,
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'PENDING',
      order: idx + 1,
      createdAt: now(),
    });
  });
  
  // 🔑 IMMEDIATE EMAIL TO EMPLOYEE — this is the automation trigger
  sendOffboardingNotification(employee, lastWorkingDate, requiredDocuments);
  
  // Also notify admin
  const adminUsers = findRows('Users', u => u.role === 'ADMIN');
  adminUsers.forEach(admin => {
    insertRow('Notifications', {
      id: generateId(),
      userId: admin.id,
      type: 'SYSTEM',
      title: `Offboarding initiated: ${employee.firstName} ${employee.lastName}`,
      body: `Last working day: ${lastWorkingDate}. ${tasks.length} tasks created.`,
      link: `?page=offboarding&id=${employeeId}`,
      isRead: false,
      createdAt: now(),
    });
  });
  
  return { success: true, tasksCreated: tasks.length };
}
```

## 6.8 — Frontend index.html (SPA Shell)

```html
<!-- index.html — served by HtmlService -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AntBox HRMS</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --purple: #8e43ac;
      --purple-light: #f3eaf7;
      --purple-dark: #6d3285;
      --border: #e4e4e7;
      --text: #09090b;
      --muted: #71717a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Poppins', sans-serif; background: #fafafa; }
    
    /* Sidebar */
    .sidebar {
      position: fixed; left: 0; top: 0;
      width: 240px; height: 100vh;
      background: white; border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      z-index: 40;
    }
    .sidebar-logo {
      height: 64px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; padding: 0 20px;
    }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 8px;
      font-size: 13px; font-weight: 500; color: var(--muted);
      cursor: pointer; transition: all 0.12s; text-decoration: none;
      margin: 1px 8px;
    }
    .nav-item.active {
      background: var(--purple-light); color: var(--purple);
      border-left: 2.5px solid var(--purple);
    }
    .nav-item:hover:not(.active) { background: #f4f4f5; }
    
    /* Main content */
    .main { margin-left: 240px; padding-top: 64px; min-height: 100vh; }
    .topbar {
      position: fixed; top: 0; left: 240px; right: 0; height: 64px;
      background: white; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; z-index: 30;
    }
    .page-content { padding: 24px; }
    
    /* Buttons */
    .btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: 'Poppins', sans-serif; transition: 0.15s; }
    .btn-primary { background: var(--purple); color: white; }
    .btn-primary:hover { background: var(--purple-dark); }
    .btn-secondary { background: #f4f4f5; color: var(--text); border: 1px solid var(--border); }
    
    /* Cards */
    .card { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .stat-card { background: var(--purple-light); border-radius: 10px; padding: 16px; }
    .stat-value { font-size: 24px; font-weight: 700; color: var(--purple-dark); }
    .stat-label { font-size: 11px; color: var(--muted); margin-top: 4px; font-weight: 500; }
    
    /* Table */
    .table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .table th { text-align: left; padding: 10px 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); border-bottom: 1px solid var(--border); }
    .table td { padding: 12px; border-bottom: 1px solid #f4f4f5; }
    .table tr:hover td { background: #fafafa; }
    
    /* Badge */
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #ecfdf5; color: #059669; }
    .badge-amber { background: #fffbeb; color: #d97706; }
    .badge-red { background: #fef2f2; color: #dc2626; }
    .badge-purple { background: var(--purple-light); color: var(--purple); }
    
    /* Loading */
    .loading { display: flex; align-items: center; justify-content: center; height: 200px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #f3f3f3; border-top: 3px solid var(--purple); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 100; display: flex; align-items: center; justify-content: center; }
    .modal { background: white; border-radius: 16px; padding: 24px; max-width: 560px; width: 90%; max-height: 90vh; overflow-y: auto; }
    
    /* Form */
    .form-group { margin-bottom: 16px; }
    .form-label { font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 6px; display: block; }
    .form-input { width: 100%; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'Poppins', sans-serif; outline: none; transition: border-color 0.15s; }
    .form-input:focus { border-color: var(--purple); box-shadow: 0 0 0 3px rgba(142,67,172,0.15); }
    .currency-input-wrap { position: relative; }
    .currency-prefix { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; color: var(--muted); font-weight: 600; pointer-events: none; }
    .form-input.with-prefix { padding-left: 22px; }
    
    #page-container { display: none; }
    #login-container { display: flex; }
  </style>
</head>
<body>
  
  <!-- Login Screen -->
  <div id="login-container" style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fafafa;">
    <div class="card" style="width:380px;padding:40px;">
      <div style="text-align:center;margin-bottom:32px;">
        <img src="https://i.ibb.co/LDcYCyy3/Copy-of-Ant-Box-BRAND-GUIDELINE-1-removebg-preview.png" alt="AntBox" style="height:48px;margin-bottom:16px;">
        <p style="font-size:20px;font-weight:700;color:#09090b;">Sign in to HRMS</p>
        <p style="font-size:12px;color:#71717a;margin-top:4px;">AntBox People Platform</p>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="login-email" class="form-input" placeholder="you@theantbox.com">
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" id="login-password" class="form-input" placeholder="••••••••">
      </div>
      <button class="btn btn-primary" style="width:100%;padding:12px;" onclick="handleLogin()">
        Sign In
      </button>
      <p id="login-error" style="color:#dc2626;font-size:12px;text-align:center;margin-top:12px;display:none;"></p>
    </div>
  </div>

  <!-- Main App Shell -->
  <div id="page-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <img src="https://i.ibb.co/LDcYCyy3/Copy-of-Ant-Box-BRAND-GUIDELINE-1-removebg-preview.png" alt="AntBox" style="height:32px;">
      </div>
      <div style="padding:16px 12px 8px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">Workspace</div>
      <nav id="sidebar-nav" style="flex:1;overflow-y:auto;padding:0 4px;"></nav>
      <div style="padding:12px;border-top:1px solid var(--border);">
        <button onclick="handleLogout()" class="nav-item" style="width:100%;color:#ef4444;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/></svg>
          Sign Out
        </button>
      </div>
    </aside>
    
    <!-- Topbar -->
    <div class="topbar">
      <h1 id="page-title" style="font-size:15px;font-weight:700;color:#09090b;">Dashboard</h1>
      <div style="display:flex;align-items:center;gap:12px;">
        <div id="notif-bell" onclick="loadPage('notifications')" style="cursor:pointer;position:relative;">
          <svg width="18" height="18" fill="none" stroke="#71717a" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
          <span id="notif-count" style="display:none;position:absolute;top:-4px;right:-4px;background:var(--purple);color:white;font-size:9px;font-weight:700;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;"></span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:30px;height:30px;border-radius:50%;background:var(--purple-light);display:flex;align-items:center;justify-content:center;">
            <span id="user-initials" style="font-size:11px;font-weight:700;color:var(--purple);"></span>
          </div>
          <span id="user-name" style="font-size:13px;font-weight:500;color:#09090b;"></span>
        </div>
      </div>
    </div>
    
    <!-- Page Content -->
    <main class="main">
      <div class="page-content" id="main-content">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </main>
  </div>

  <script>
    // ── State ──────────────────────────────────────────────────────────────
    let currentUser = null;
    let currentToken = null;
    const APP_URL = window.location.href.split('?')[0];
    
    const ADMIN_NAV = [
      { label: 'Dashboard', page: 'dashboard', icon: 'grid' },
      { label: 'Employees', page: 'employees', icon: 'users' },
      { label: 'Onboarding', page: 'onboarding', icon: 'user-plus' },
      { label: 'Offboarding', page: 'offboarding', icon: 'user-minus' },
      { label: 'Attendance', page: 'attendance', icon: 'clock' },
      { label: 'Leave', page: 'leave', icon: 'calendar' },
      { label: 'Payroll', page: 'payroll', icon: 'dollar-sign' },
      { label: 'Documents', page: 'documents', icon: 'file-text' },
      { label: 'Portal', page: 'portal', icon: 'briefcase' },
      { label: 'Calendar', page: 'calendar', icon: 'calendar' },
      { label: 'Settings', page: 'settings', icon: 'settings' },
    ];
    
    const EMPLOYEE_NAV = [
      { label: 'My Dashboard', page: 'dashboard', icon: 'grid' },
      { label: 'Attendance', page: 'attendance', icon: 'clock' },
      { label: 'Leave', page: 'leave', icon: 'calendar' },
      { label: 'My Payslips', page: 'payslips', icon: 'dollar-sign' },
      { label: 'Documents', page: 'my-documents', icon: 'file-text' },
      { label: 'Reimbursements', page: 'reimbursements', icon: 'briefcase' },
      { label: 'Calendar', page: 'calendar', icon: 'calendar' },
    ];
    
    // ── API Call ───────────────────────────────────────────────────────────
    async function api(action, data = {}) {
      const response = await fetch(APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token: currentToken, ...data }),
      });
      return response.json();
    }
    
    // ── Auth ───────────────────────────────────────────────────────────────
    async function handleLogin() {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const errEl = document.getElementById('login-error');
      
      try {
        const res = await api('auth.login', { email, password });
        if (!res.success) {
          errEl.textContent = res.error || 'Login failed';
          errEl.style.display = 'block';
          return;
        }
        currentToken = res.token;
        currentUser = res.user;
        localStorage.setItem('antbox_token', currentToken);
        localStorage.setItem('antbox_user', JSON.stringify(currentUser));
        initApp();
      } catch (e) {
        errEl.textContent = 'Connection error. Please try again.';
        errEl.style.display = 'block';
      }
    }
    
    function handleLogout() {
      api('auth.logout');
      localStorage.removeItem('antbox_token');
      localStorage.removeItem('antbox_user');
      location.reload();
    }
    
    // ── App Init ───────────────────────────────────────────────────────────
    function initApp() {
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('page-container').style.display = 'block';
      
      // Set user info in topbar
      const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
      document.getElementById('user-initials').textContent = initials;
      document.getElementById('user-name').textContent = currentUser.name;
      
      // Build sidebar
      const nav = currentUser.role === 'ADMIN' ? ADMIN_NAV : EMPLOYEE_NAV;
      const navEl = document.getElementById('sidebar-nav');
      navEl.innerHTML = nav.map(item => `
        <a class="nav-item" onclick="loadPage('${item.page}')" data-page="${item.page}">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            ${getIconPath(item.icon)}
          </svg>
          ${item.label}
        </a>
      `).join('');
      
      loadPage('dashboard');
      loadNotifications();
    }
    
    async function loadPage(page) {
      // Update active nav item
      document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
      });
      
      document.getElementById('main-content').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      
      // Page titles
      const titles = {
        dashboard: 'Dashboard', employees: 'Employees', onboarding: 'Onboarding',
        offboarding: 'Offboarding', attendance: 'Attendance', leave: 'Leave',
        payroll: 'Payroll', documents: 'Documents', portal: 'Portal',
        calendar: 'Calendar', settings: 'Settings', notifications: 'Notifications',
        payslips: 'My Payslips', 'my-documents': 'My Documents',
        reimbursements: 'Reimbursements',
      };
      document.getElementById('page-title').textContent = titles[page] || page;
      
      try {
        switch(page) {
          case 'dashboard':     await renderDashboard(); break;
          case 'employees':     await renderEmployees(); break;
          case 'attendance':    await renderAttendance(); break;
          case 'leave':         await renderLeave(); break;
          case 'payroll':       await renderPayroll(); break;
          case 'onboarding':    await renderOnboarding(); break;
          case 'offboarding':   await renderOffboarding(); break;
          case 'documents':     await renderDocuments(); break;
          case 'calendar':      await renderCalendar(); break;
          case 'notifications': await renderNotifications(); break;
          case 'portal':        await renderPortal(); break;
          case 'reimbursements': await renderReimbursements(); break;
          default: document.getElementById('main-content').innerHTML = '<p>Page not found</p>';
        }
      } catch(e) {
        document.getElementById('main-content').innerHTML = `<div class="card"><p style="color:#dc2626">Error loading page: ${e.message}</p></div>`;
      }
    }
    
    // ── Dashboard Render ────────────────────────────────────────────────────
    async function renderDashboard() {
      const res = await api('dashboard.stats');
      if (!res.success) return;
      const s = res.data;
      
      const adminContent = currentUser.role === 'ADMIN' ? `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
          ${statCard('Active Employees', s.activeCount, 'Total headcount')}
          ${statCard('Present Today', s.presentToday, `${s.presentPct}% attendance`)}
          ${statCard('On Leave', s.onLeaveToday, 'Approved leaves today')}
          ${statCard('Pending Leaves', s.pendingLeaves, 'Awaiting approval', 'amber')}
        </div>
        
        <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:16px;margin-bottom:24px;">
          <div class="card">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#71717a;margin-bottom:12px;">Recent Activity</p>
            ${(s.recentActivity||[]).map(a => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f4f4f5;">
                <div style="width:6px;height:6px;border-radius:50%;background:var(--purple);flex-shrink:0;"></div>
                <div>
                  <p style="font-size:12px;font-weight:500;color:#09090b;">${a.title}</p>
                  <p style="font-size:11px;color:#71717a;">${a.description}</p>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="card">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#71717a;margin-bottom:12px;">Quick Actions</p>
            ${[
              ['Run Payroll', 'payroll'],
              ['Add Employee', 'employees'],
              ['Approve Leaves', 'leave'],
              ['Offboard Employee', 'offboarding'],
            ].map(([label, page]) => `
              <div onclick="loadPage('${page}')" style="display:flex;align-items:center;justify-content:space-between;padding:10px;border-radius:8px;border:1px solid var(--border);margin-bottom:8px;cursor:pointer;transition:.12s;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background='white'">
                <span style="font-size:12px;font-weight:600;color:#09090b;">${label}</span>
                <svg width="14" height="14" fill="none" stroke="#71717a" stroke-width="2" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Upcoming offboarding -->
        ${s.upcomingOffboarding?.length > 0 ? `
        <div class="card" style="margin-bottom:16px;border-color:#fca5a5;background:#fff5f5;">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:#dc2626;margin-bottom:10px;">⚠ Upcoming Exits (30 days)</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">
            ${s.upcomingOffboarding.map(e => `
              <div onclick="loadPage('offboarding')" style="padding:10px;background:white;border-radius:8px;border:1px solid #fca5a5;cursor:pointer;">
                <p style="font-size:12px;font-weight:600;">${e.firstName} ${e.lastName}</p>
                <p style="font-size:11px;color:#71717a;">${e.designation}</p>
                <p style="font-size:11px;color:#dc2626;font-weight:600;">Last day: ${e.lastWorkingDate}</p>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      ` : `
        <!-- Employee Dashboard -->
        <div style="margin-bottom:20px;">
          <p style="font-size:22px;font-weight:700;">Good ${getTimeOfDay()}, ${currentUser.name.split(' ')[0]}! 👋</p>
          <p style="font-size:13px;color:#71717a;margin-top:4px;">${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
        </div>
        ${await renderClockWidget()}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px;">
          ${(s.leaveBalances||[]).slice(0,3).map(b => `
            <div class="stat-card">
              <div class="stat-value">${(b.allocated||0) - (b.used||0)}</div>
              <div class="stat-label">${b.leaveTypeName} remaining</div>
            </div>
          `).join('')}
        </div>
      `;
      
      document.getElementById('main-content').innerHTML = adminContent;
    }
    
    function statCard(label, value, subtext, color='purple') {
      const bgMap = { purple: 'var(--purple-light)', amber: '#fffbeb', green: '#ecfdf5' };
      const textMap = { purple: 'var(--purple-dark)', amber: '#d97706', green: '#059669' };
      return `
        <div class="card" style="background:${bgMap[color]||bgMap.purple};">
          <div style="font-size:28px;font-weight:700;color:${textMap[color]||textMap.purple};">${value}</div>
          <div style="font-size:12px;font-weight:600;color:#09090b;margin-top:4px;">${label}</div>
          <div style="font-size:11px;color:#71717a;margin-top:2px;">${subtext}</div>
        </div>`;
    }
    
    function getTimeOfDay() {
      const h = new Date().getHours();
      if (h < 12) return 'morning';
      if (h < 17) return 'afternoon';
      return 'evening';
    }
    
    // ── Attendance Render ────────────────────────────────────────────────────
    async function renderAttendance() {
      const res = await api('attendance.today');
      const clockWidget = await renderClockWidgetHtml(res.data);
      
      let teamTable = '';
      if (currentUser.role === 'ADMIN') {
        const reportRes = await api('attendance.report', { month: new Date().getMonth()+1, year: new Date().getFullYear() });
        teamTable = renderAttendanceTable(reportRes.data);
      }
      
      document.getElementById('main-content').innerHTML = clockWidget + teamTable;
    }
    
    async function renderClockWidgetHtml(data) {
      const isIn = data?.nextAction === 'PUNCH_OUT';
      return `
        <div class="card" style="max-width:380px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
              <p style="font-size:12px;color:#71717a;">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short',year:'numeric'})}</p>
              <p id="live-clock" style="font-size:24px;font-weight:700;">--:--:--</p>
            </div>
            <span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${isIn?'#ecfdf5':'#f4f4f5'};color:${isIn?'#059669':'#71717a'};">
              ${isIn ? '● Active' : '○ Inactive'}
            </span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
            <div style="background:#f4f4f5;border-radius:8px;padding:10px;text-align:center;">
              <p style="font-size:11px;color:#71717a;">Total today</p>
              <p style="font-size:16px;font-weight:700;">${formatHoursGAS(data?.totalHours)}</p>
            </div>
            <div style="background:#f4f4f5;border-radius:8px;padding:10px;text-align:center;">
              <p style="font-size:11px;color:#71717a;">Sessions</p>
              <p style="font-size:16px;font-weight:700;">${data?.punchCount || 0}</p>
            </div>
          </div>
          <button onclick="handlePunch('${isIn ? 'OUT' : 'IN'}')" 
            style="width:100%;padding:14px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:none;background:${isIn?'#ef4444':'var(--purple)'};color:white;font-family:'Poppins',sans-serif;">
            ${isIn ? 'Punch Out' : 'Punch In'}
          </button>
          ${(data?.punches||[]).length > 0 ? `
          <div style="margin-top:14px;">
            <p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#71717a;margin-bottom:6px;">Today's punches</p>
            ${data.punches.map(p => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:6px;background:${p.isAssumed?'#fffbeb':'#f4f4f5'};margin-bottom:4px;">
                <span style="font-size:11px;font-weight:600;color:${p.punchType==='IN'?'#059669':'#dc2626'};">${p.isAssumed?'⚠ ':''}${p.punchType==='IN'?'In':'Out'}</span>
                <span style="font-size:11px;font-family:monospace;">${new Date(p.punchedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true})}</span>
              </div>
            `).join('')}
          </div>` : ''}
        </div>`;
    }
    
    async function handlePunch(punchType) {
      const res = await api('attendance.punch', { punchType });
      if (res.success) {
        await renderAttendance();
      } else {
        alert(res.error || 'Punch failed');
      }
    }
    
    function formatHoursGAS(hours) {
      if (!hours) return '0h 00m';
      const mins = Math.round(hours * 60);
      return `${Math.floor(mins/60)}h ${String(mins%60).padStart(2,'0')}m`;
    }
    
    // ── Leave Render ──────────────────────────────────────────────────────────
    async function renderLeave() {
      const [balancesRes, requestsRes] = await Promise.all([
        api('leave.balances'),
        api('leave.list'),
      ]);
      
      const balances = balancesRes.data?.balances || [];
      const requests = requestsRes.data?.requests || [];
      
      document.getElementById('main-content').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
          ${balances.map(b => `
            <div class="stat-card">
              <div class="stat-value">${(b.allocated||0)-(b.used||0)}</div>
              <div style="font-size:12px;font-weight:600;color:#09090b;margin-top:2px;">${b.leaveTypeName}</div>
              <div style="font-size:11px;color:#71717a;">${b.used||0} used of ${b.allocated||0}</div>
            </div>
          `).join('')}
        </div>
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-size:14px;font-weight:700;">Leave Requests</h3>
          <button class="btn btn-primary" onclick="showApplyLeaveModal()">+ Apply Leave</button>
        </div>
        
        <div class="card" style="padding:0;overflow:hidden;">
          <table class="table">
            <thead>
              <tr>
                <th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th>
                ${currentUser.role === 'ADMIN' ? '<th>Action</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${requests.map(r => `
                <tr>
                  <td style="font-weight:500;">${r.employeeFirstName} ${r.employeeLastName}</td>
                  <td>${r.leaveTypeName}</td>
                  <td>${r.startDate}</td>
                  <td>${r.endDate}</td>
                  <td>${r.days}</td>
                  <td><span class="badge badge-${r.status==='APPROVED'?'green':r.status==='REJECTED'?'red':'amber'}">${r.status}</span></td>
                  ${currentUser.role === 'ADMIN' && r.status === 'PENDING' ? `
                    <td>
                      <button onclick="handleLeaveDecision('${r.id}','approve')" style="font-size:11px;font-weight:600;color:#059669;cursor:pointer;border:none;background:none;">Approve</button>
                      <button onclick="handleLeaveDecision('${r.id}','reject')" style="font-size:11px;font-weight:600;color:#dc2626;cursor:pointer;border:none;background:none;margin-left:8px;">Reject</button>
                    </td>` : currentUser.role === 'ADMIN' ? '<td>—</td>' : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div id="leave-modal"></div>
      `;
    }
    
    // ── Payroll Render ────────────────────────────────────────────────────────
    async function renderPayroll() {
      if (currentUser.role !== 'ADMIN') {
        return renderMyPayslips();
      }
      const res = await api('payroll.list');
      const runs = res.data?.runs || [];
      
      document.getElementById('main-content').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <h2 style="font-size:18px;font-weight:700;">Payroll</h2>
            <p style="font-size:12px;color:#71717a;">Manage monthly salary disbursements</p>
          </div>
          <button class="btn btn-primary" onclick="showRunPayrollModal()">▶ Run Payroll</button>
        </div>
        
        <div class="card" style="padding:0;overflow:hidden;">
          <table class="table">
            <thead>
              <tr><th>Period</th><th>Status</th><th>Employees</th><th>Total Net</th><th>Run By</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${runs.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:40px;color:#71717a;">No payroll runs yet. Click "Run Payroll" to start.</td></tr>` : ''}
              ${runs.map(r => `
                <tr>
                  <td style="font-weight:600;">${MONTH_NAMES[r.month-1]} ${r.year}</td>
                  <td><span class="badge badge-${r.status==='PAID'?'green':r.status==='APPROVED'?'purple':'amber'}">${r.status}</span></td>
                  <td>${r.totalEmployees || '—'}</td>
                  <td style="font-weight:600;">₹${(r.totalNet||0).toLocaleString('en-IN')}</td>
                  <td>${r.createdByName || 'Admin'}</td>
                  <td>
                    <button onclick="viewPayrollRun('${r.id}')" style="font-size:11px;font-weight:600;color:var(--purple);border:none;background:none;cursor:pointer;">View →</button>
                    ${r.status === 'APPROVED' ? `<button onclick="sendPayslips('${r.id}')" style="font-size:11px;font-weight:600;color:#059669;border:none;background:none;cursor:pointer;margin-left:8px;">Send Payslips</button>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div id="payroll-modal"></div>
      `;
    }
    
    const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    
    // ── Notifications ──────────────────────────────────────────────────────────
    async function loadNotifications() {
      const res = await api('notifications.list');
      const count = res.data?.unread || 0;
      const countEl = document.getElementById('notif-count');
      if (count > 0) {
        countEl.style.display = 'flex';
        countEl.textContent = count > 9 ? '9+' : count;
      } else {
        countEl.style.display = 'none';
      }
    }
    
    // ── Icon SVG Paths ────────────────────────────────────────────────────────
    function getIconPath(icon) {
      const icons = {
        'grid': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
        'users': '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
        'user-plus': '<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
        'user-minus': '<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/>',
        'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
        'dollar-sign': '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
        'file-text': '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
        'briefcase': '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>',
        'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
      };
      return icons[icon] || '';
    }
    
    // ── Live Clock ────────────────────────────────────────────────────────────
    setInterval(() => {
      const el = document.getElementById('live-clock');
      if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });
    }, 1000);
    
    // ── Bootstrap ──────────────────────────────────────────────────────────────
    const savedToken = localStorage.getItem('antbox_token');
    const savedUser = localStorage.getItem('antbox_user');
    
    if (savedToken && savedUser) {
      currentToken = savedToken;
      currentUser = JSON.parse(savedUser);
      initApp();
    }
  </script>
</body>
</html>
```

## 6.9 — Setup Script (run once to initialise the Sheets)

```javascript
// setup.gs — Run this ONCE to initialise all sheets and seed data

function setupHRMS() {
  const props = PropertiesService.getScriptProperties();
  
  // Create the spreadsheet if not exists
  let ss;
  const existingId = props.getProperty('SPREADSHEET_ID');
  if (existingId) {
    ss = SpreadsheetApp.openById(existingId);
  } else {
    ss = SpreadsheetApp.create('AntBox HRMS Database');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    Logger.log('Created spreadsheet: ' + ss.getId());
  }
  
  // Create all sheets with headers
  const sheets = {
    'Users': ['id','email','passwordHash','role','isActive','createdAt'],
    'Sessions': ['id','userId','token','expiresAt','createdAt'],
    'Employees': ['id','userId','firstName','lastName','email','personalEmail','phone','employeeId','designation','departmentId','managerId','employmentType','status','joiningDate','lastWorkingDate','basicSalary','hra','specialAllowance','professionalTax','pan','bankAccountNo','ifscCode','bankName','ctc','address','city','state','pincode','dateOfBirth','gender','emergencyContact','emergencyPhone','createdAt'],
    'Departments': ['id','name','code','headId','createdAt'],
    'AttendanceRecords': ['id','employeeId','workDate','totalHours','status','createdAt'],
    'AttendancePunches': ['id','recordId','employeeId','punchType','punchedAt','isAssumed','assumedReason','createdAt'],
    'LeaveTypes': ['id','name','code','daysPerYear','carryoverLimit','isPaid','applicableTo'],
    'LeaveBalances': ['id','employeeId','leaveTypeId','year','allocated','used','pending','carryover'],
    'LeaveRequests': ['id','employeeId','leaveTypeId','startDate','endDate','days','reason','status','approverId','approvedAt','rejectionReason','createdAt'],
    'PayrollRuns': ['id','month','year','status','createdBy','periodStart','periodEnd','totalGross','totalNet','totalDeductions','totalEmployees','paidAt','createdAt'],
    'PayrollLines': ['id','runId','employeeId','basicSalary','hra','specialAllowance','grossEarnings','pf','esi','professionalTax','tds','lop','totalDeductions','netPay','paidDays','lopDays','workingDays','payslipUrl','payslipSentAt','createdAt'],
    'Documents': ['id','employeeId','type','title','fileUrl','issuedDate','issuedBy','signedBy','emailSentAt','createdAt'],
    'OnboardingTasks': ['id','employeeId','title','category','assignedTo','dueDate','status','notes','isRequired','order','completedAt','createdAt'],
    'OffboardingTasks': ['id','employeeId','title','category','assignedTo','dueDate','status','notes','order','completedAt','createdAt'],
    'Notifications': ['id','userId','type','title','body','link','isRead','emailSent','createdAt'],
    'Reimbursements': ['id','employeeId','title','category','amount','currency','date','description','receiptUrl','status','approverId','approvedAt','paidAt','rejectionReason','createdAt'],
    'Holidays': ['id','name','date','type','description'],
    'CompanyEvents': ['id','title','description','startDate','endDate','allDay','category','createdBy','createdAt'],
  };
  
  Object.entries(sheets).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      Logger.log('Created sheet: ' + name);
    }
  });
  
  // Seed admin user (password: AntBox@2025)
  const adminPwHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'AntBox@2025')
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  
  const adminId = Utilities.getUuid();
  const usersSheet = ss.getSheetByName('Users');
  usersSheet.appendRow([adminId, 'admin@theantbox.com', adminPwHash, 'ADMIN', true, new Date().toISOString()]);
  
  // Seed departments
  const depts = ['Engineering', 'Marketing', 'Operations', 'GTM', 'Revenue Ops', 'Data Analytics'];
  const deptsSheet = ss.getSheetByName('Departments');
  depts.forEach(d => {
    deptsSheet.appendRow([Utilities.getUuid(), d, d.replace(/\s+/g,'').toUpperCase().slice(0,3), '', new Date().toISOString()]);
  });
  
  // Seed leave types
  const leaveTypes = [
    { name: 'Casual Leave', code: 'CL', days: 12, carryover: 0, paid: true },
    { name: 'Sick Leave', code: 'SL', days: 7, carryover: 0, paid: true },
    { name: 'Privilege Leave', code: 'PL', days: 21, carryover: 15, paid: true },
    { name: 'Maternity Leave', code: 'ML', days: 182, carryover: 0, paid: true },
    { name: 'Paternity Leave', code: 'PTL', days: 15, carryover: 0, paid: true },
  ];
  const ltSheet = ss.getSheetByName('LeaveTypes');
  leaveTypes.forEach(lt => {
    ltSheet.appendRow([Utilities.getUuid(), lt.name, lt.code, lt.days, lt.carryover, lt.paid, 'ALL']);
  });
  
  // Seed 2025-26 Indian holidays
  const holidays = [
    ['Republic Day', '2026-01-26'],
    ['Holi', '2026-03-30'],
    ['Good Friday', '2026-04-03'],
    ['Independence Day', '2026-08-15'],
    ['Gandhi Jayanti', '2026-10-02'],
    ['Diwali', '2026-10-20'],
    ['Christmas', '2026-12-25'],
  ];
  const holSheet = ss.getSheetByName('Holidays');
  holidays.forEach(([name, date]) => {
    holSheet.appendRow([Utilities.getUuid(), name, date, 'NATIONAL', '']);
  });
  
  Logger.log('✅ AntBox HRMS setup complete. Admin: admin@theantbox.com / AntBox@2025');
  Logger.log('Spreadsheet URL: ' + ss.getUrl());
  
  // Return the web app URL
  Logger.log('Deploy as Web App and share: ' + ScriptApp.getService().getUrl());
}
```

## 6.10 — Deployment Instructions (GAS)

```
STEP-BY-STEP DEPLOYMENT:

1. Go to script.google.com → New Project → Name it "AntBox HRMS"

2. Create these files in the GAS editor:
   Code.gs      → paste the doGet/doPost router
   DB.gs        → paste the Sheets CRUD helpers
   Auth.gs      → paste login/session functions
   Email.gs     → paste email sending functions
   Employees.gs → employee CRUD
   Attendance.gs → punch in/out + reports
   Leave.gs     → leave request/approval
   Payroll.gs   → payroll engine + payslip generation
   Offboarding.gs → initiate + task creation + email trigger
   Onboarding.gs → task creation + welcome email
   Documents.gs → document generation to Google Docs
   Notifications.gs → in-app + email notifications
   Setup.gs     → one-time setup
   index.html   → paste the full SPA HTML

3. Run setupHRMS() once to:
   - Create the Google Sheets database
   - Seed admin user, departments, leave types, holidays

4. Deploy as Web App:
   Deploy → New deployment
   Type: Web App
   Execute as: Me (your Google account)
   Who has access: Anyone (for external access) OR 
                   Anyone within organisation (for internal only)
   
   Copy the deployment URL

5. Update theantbox.com to link to new deployment URL

6. Share the spreadsheet URL with HR — they can open it in Sheets
   for direct data editing when needed (this is the "comfortable with Excel" requirement)

7. For Gmail access, enable Gmail API in the GAS project:
   Services → + Add service → Gmail API

8. Test login: admin@theantbox.com / AntBox@2025

ZERO COST:
- Google Apps Script: Free (6 min execution limit per run — fine for HRMS)
- Google Sheets: Free (up to 5M cells — more than enough for 200 employees × 10 years)
- Google Drive: Free (15 GB — for document storage)
- Gmail: Free (500 emails/day via GmailApp — covers all payslips + notifications)
- Deployment URL: Free subdomain on script.google.com
```

---

## FINAL CHECKLIST — verify before marking complete

```
Deletions:
□ app/(dashboard)/it-ops/page.tsx — DELETED
□ app/api/it-tasks/route.ts — DELETED  
□ components/it-ops/ITOpsBoard.tsx — DELETED
□ app/(dashboard)/grievances/page.tsx — DELETED
□ app/api/grievances/route.ts + [id]/route.ts — DELETED
□ components/grievances/GrievancePortal.tsx — DELETED
□ app/(dashboard)/reports/page.tsx — DELETED
□ app/api/reports/export/route.ts — DELETED

Schema changes:
□ Role enum simplified to ADMIN + EMPLOYEE
□ Grievance, GrievanceComment models removed
□ ITTask, ITTaskType, ITTaskStatus removed
□ AttendancePunch.isAssumed + assumedReason fields added
□ Migration run: npx prisma migrate dev --name "simplify_roles_remove_modules"

Sidebar:
□ IT Ops nav item removed
□ Grievances nav item removed
□ Reports nav item removed
□ Two-role nav arrays implemented (ADMIN_NAV, EMPLOYEE_NAV)

Dashboard:
□ openGrievances stat card removed
□ DeptHeadcountChart added
□ LeaveStatsChart added
□ PayrollSummaryCard added
□ UpcomingOffboardingWidget added
□ PendingLeavesWidget added
□ Compact calendar embedded
□ Employee-specific dashboard view implemented

Payroll:
□ 3-step run wizard implemented
□ Employee detail payslip modal implemented
□ History tab added
□ Salary structure shown in employee profile
□ LOP auto-calculated from attendance records

Attendance:
□ isAssumed field shown in UI (amber styling)
□ Missing punch-in auto-fills at 9:00 AM
□ Cron job for missed punch-out (default to 6:00 PM)
□ GitHub Actions cron added for fix-incomplete-attendance

GAS conversion:
□ Code.gs router created
□ DB.gs Sheets CRUD layer created
□ Auth.gs login/session created
□ Email.gs Gmail automation created
□ Offboarding.gs with immediate email trigger
□ setup.gs one-time initialiser created
□ index.html SPA shell created
□ Deployed as Web App
□ setupHRMS() run once
□ theantbox.com link updated to new deployment URL
```

---
*AntBox HRMS — Antigravity Meta-Prompt*
*Prepared: June 2026 | antbox-hrms codebase v0.1*
*people@theantbox.com | Bhubaneswar, Odisha*
ENDPROMPT
echo "Done"