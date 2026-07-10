"use client";

import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Search, LogOut, User, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { EmployeeProfileDrawer } from "@/components/layout/EmployeeProfileDrawer";
import type { Role } from "@prisma/client";

interface EmployeeProfile {
  id: string;
  employeeId: string;
  gender?: string | null;
  firstName: string;
  lastName: string;
  designation: string;
  department: { name: string };
  managerId?: string | null;
  employmentType: string;
  status: string;
  joiningDate: Date | string;
  phone?: string | null;
  personalEmail?: string | null;
  dateOfBirth?: Date | string | null;
  bloodGroup?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  ifscCode?: string | null;
  pan?: string | null;
}

interface TopbarProps {
  user: { name?: string | null; email?: string | null; role: Role };
  employee?: EmployeeProfile | null;
}

export function Topbar({ user, employee }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ type: "page" | "employee"; name: string; href: string }[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string; designation: string; email: string }[]>([]);
  const [hasFetchedEmployees, setHasFetchedEmployees] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchEmployeesIfNeeded = async () => {
    if (hasFetchedEmployees) return;
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        setHasFetchedEmployees(true);
      }
    } catch (err) {
      console.error("Failed to fetch employees for search", err);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    fetchEmployeesIfNeeded();

    const pages = [
      { name: "Dashboard 📊", href: "/" },
      { name: "Employees 👥", href: "/employees" },
      { name: "Onboarding 🚀", href: "/onboarding" },
      { name: "Separation 🚪", href: "/separation" },
      { name: "Offboarding 🧹", href: "/offboarding" },
      { name: "Attendance ⏰", href: "/attendance" },
      { name: "Leave 🌴", href: "/leave" },
      { name: "Payroll 💰", href: "/payroll" },
      { name: "Documents 📂", href: "/documents" },
      { name: "Portal 💼", href: "/portal" },
      { name: "POSH 🛡️", href: "/posh" },
      { name: "Calendar 📅", href: "/calendar" },
      { name: "Reports 📈", href: "/reports" },
      { name: "Policy 📖", href: "/policy" },
      { name: "Settings ⚙️", href: "/settings" },
    ];

    const matchedPages = pages
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .map((p) => ({ type: "page" as const, name: p.name, href: p.href }));

    const matchedEmployees = employees
      .filter((emp) =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
        emp.designation.toLowerCase().includes(query.toLowerCase()) ||
        emp.email.toLowerCase().includes(query.toLowerCase())
      )
      .map((emp) => ({
        type: "employee" as const,
        name: `${emp.firstName} ${emp.lastName} (${emp.designation})`,
        href: `/employees/${emp.id}`,
      }));

    setSearchResults([...matchedPages, ...matchedEmployees]);
    setShowResults(true);
  };

  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AB";

  const getHeaderInfo = (path: string) => {
    const todayStr = format(new Date(), "EEEE, d MMM yyyy");
    if (path === "/") return { title: "Dashboard", description: "" };
    if (path.startsWith("/employees")) return { title: "Employees", description: "Manage your team" };
    if (path.startsWith("/onboarding")) return { title: "Onboarding", description: "Employee onboarding checklist and tasks" };
    if (path.startsWith("/separation")) return { title: "Separation", description: "Resignation and notice period management" };
    if (path.startsWith("/offboarding")) return { title: "Offboarding", description: "Employee offboarding checklist and tasks" };
    if (path.startsWith("/attendance")) return { title: "Attendance", description: todayStr };
    if (path.startsWith("/leave")) return { title: "Leave", description: "Plan time off without the chaos" };
    if (path.startsWith("/payroll")) return { title: "Payroll", description: "Salary, slips & monthly cycles" };
    if (path.startsWith("/documents")) return { title: "Documents", description: "Employee documents and files" };
    if (path.startsWith("/portal")) return { title: "Portal", description: "Employee self-service portal" };
    if (path.startsWith("/posh")) return { title: "POSH", description: "Confidential — your report goes directly to HR" };
    if (path.startsWith("/calendar")) return { title: "Calendar", description: "Events, holidays, and schedules" };
    if (path.startsWith("/reports")) return { title: "Reports", description: "Reports and analysis" };
    if (path.startsWith("/settings")) return { title: "Settings", description: "Manage your account and workspace" };
    if (path.startsWith("/policy")) return { title: "Policy", description: "Company leave policies and workplace rules" };
    if (path.startsWith("/notifications")) return { title: "Notifications", description: "System alerts and notifications" };
    return { title: "AntBox HRMS", description: "Talent-Tech People Platform" };
  };

  const { title, description } = getHeaderInfo(pathname);

  return (
    <>
      <header className="flex w-full h-full items-center justify-between bg-white">
        <div>
          <h1 className="text-base font-bold text-[var(--brand-secondary)] leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-[var(--neutral-400)] font-medium leading-none mt-0.5">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div ref={dropdownRef} className="relative hidden w-72 items-center gap-2 rounded-lg border border-[var(--border)] bg-zinc-50 px-3 py-1.5 md:flex focus-within:border-[var(--purple)] focus-within:ring-1 focus-within:ring-[var(--purple)] transition-all duration-200">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              type="search"
              placeholder="Search Anything..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                fetchEmployeesIfNeeded();
                if (searchQuery.trim()) setShowResults(true);
              }}
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-400 text-zinc-900"
            />
            <kbd className="pointer-events-none inline-flex h-4.5 select-none items-center gap-0.5 rounded border bg-white px-1.5 font-mono text-[9px] font-medium text-zinc-400">
              <span>⌘</span>K
            </kbd>
            {showResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-lg border border-[var(--border)] bg-white p-1.5 shadow-lg z-50">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      router.push(result.href);
                      setShowResults(false);
                      setSearchQuery("");
                    }}
                    className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs text-zinc-700 hover:bg-[var(--neutral-100)] hover:text-zinc-950 transition-colors"
                  >
                    <span>{result.name}</span>
                    <span className="text-[9px] uppercase font-bold text-zinc-400">
                      {result.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showResults && searchResults.length === 0 && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1.5 rounded-lg border border-[var(--border)] bg-white p-3 text-center text-xs text-zinc-400 shadow-lg z-50">
                No matches found
              </div>
            )}
          </div>

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 outline-none">
              <div className="hidden text-right md:block">
                <p className="text-xs font-bold text-zinc-900 leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] font-bold text-[var(--purple)] uppercase tracking-wider leading-none mt-0.5">
                  {user.role === "ADMIN"
                    ? user.email?.toLowerCase() === "chandrita@theantbox.com"
                      ? "HR Admin"
                      : user.email?.toLowerCase() === "ritesh@theantbox.com"
                      ? "Founder's Office"
                      : "Super Admin"
                    : user.role.replace("_", " ")}
                </p>
              </div>
              <Avatar className="h-8 w-8 border border-zinc-200">
                <AvatarFallback className="bg-[var(--brand-secondary)] text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {employee && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setDrawerOpen(true)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push("/portal")}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Employee Portal
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                className="text-[var(--danger)] cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {employee && (
        <EmployeeProfileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          employee={employee}
        />
      )}
    </>
  );
}
