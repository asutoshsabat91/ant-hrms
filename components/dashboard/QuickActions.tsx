import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const adminActions = [
  { label: "Run Payroll", desc: "Monthly cycle", href: "/payroll" },
  { label: "Approve Leaves", desc: "Review requests", href: "/leave" },
  { label: "Separations", desc: "Resignation pipeline", href: "/separation" },
  { label: "Procurement", desc: "Pending approvals", href: "/portal/reimbursements" },
];

const employeeActions = [
  { label: "My Leaves", desc: "Apply & view requests", href: "/leave" },
  { label: "Attendance", desc: "Clock in / out", href: "/attendance" },
  { label: "Company Policy", desc: "View company rules", href: "/policy" },
  { label: "Procurement", desc: "Request & track", href: "/portal/reimbursements" },
];

interface QuickActionsProps {
  isAdmin?: boolean;
}

export function QuickActions({ isAdmin = false }: QuickActionsProps) {
  const actions = isAdmin ? adminActions : employeeActions;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="group relative flex flex-col justify-between rounded-xl border border-[var(--border)] bg-white p-5 overflow-hidden transition-all duration-500 ease-[var(--ease-out-expo)] hover:border-zinc-950 hover:shadow-lg"
        >
          <div className="absolute inset-0 bg-zinc-950 origin-bottom scale-y-0 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-y-100 z-0" />
          <div className="relative z-10 flex flex-col justify-between h-full w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 group-hover:text-white transition-colors duration-500">
                {action.label}
              </span>
              <ArrowUpRight className="h-4 w-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-500" />
            </div>
            <span className="mt-2 text-[10px] font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors duration-500">
              {action.desc}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
