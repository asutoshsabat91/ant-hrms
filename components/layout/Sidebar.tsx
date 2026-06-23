"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserMinus,
  Clock,
  CalendarDays,
  Wallet,
  FileText,
  Briefcase,
  Calendar,
  Settings,
  LogOut,
  DoorOpen,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

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
  { title: "Separation",   href: "/separation",   icon: DoorOpen },
  { title: "POSH",         href: "/posh",         icon: ShieldCheck },
  { title: "Calendar",     href: "/calendar",     icon: Calendar },
  { title: "Settings",     href: "/settings",     icon: Settings },
];

const EMPLOYEE_NAV = [
  { title: "My Dashboard",    href: "/",                        icon: LayoutDashboard },
  { title: "Attendance",      href: "/attendance",              icon: Clock },
  { title: "Leave",           href: "/leave",                   icon: CalendarDays },
  { title: "Personal",        href: "/portal",                  icon: FileText },
  { title: "Documents",       href: "/documents",               icon: FileText },
  { title: "Reimbursements",  href: "/portal/reimbursements",   icon: Briefcase },
  { title: "Separation",      href: "/separation",              icon: DoorOpen },
  { title: "Calendar",        href: "/calendar",                icon: Calendar },
];

const COMPANY_ADMIN_NAV = [
  { title: "Dashboard",    href: "/",             icon: LayoutDashboard },
  { title: "Employees",    href: "/employees",    icon: Users },
  { title: "Attendance",   href: "/attendance",   icon: Clock },
  { title: "Leave",        href: "/leave",        icon: CalendarDays },
  { title: "Personal",     href: "/portal",       icon: FileText },
  { title: "Documents",    href: "/documents",    icon: FileText },
  { title: "Separation",   href: "/separation",   icon: DoorOpen },
  { title: "Calendar",     href: "/calendar",     icon: Calendar },
  { title: "Settings",     href: "/settings",     icon: Settings },
];

interface SidebarProps {
  role: Role;
  gender?: string | null;
}

export function Sidebar({ role, gender }: SidebarProps) {
  const pathname = usePathname();

  let baseNav = EMPLOYEE_NAV;
  if (role === "ADMIN") {
    baseNav = ADMIN_NAV;
  } else if (role === "COMPANY_ADMIN") {
    baseNav = COMPANY_ADMIN_NAV;
  }

  const visible = baseNav.filter((item) => {
    if (item.href === "/posh" && gender?.toUpperCase() !== "FEMALE") return false;
    return true;
  });

  return (
    <aside className="flex h-full w-full flex-col bg-[var(--sidebar-bg)]">
      <div className="flex h-16 items-center border-b border-[var(--border)] px-6 bg-transparent justify-start">
        <Image src="/logo.png" alt="AntBox Logo" width={110} height={28} className="object-contain brightness-0 invert" />
      </div>

      <div className="px-5 py-2 mt-4 text-[10px] font-bold tracking-wider text-[var(--neutral-400)] uppercase">
        Workspace
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {visible.map((item) => {
          const [itemPath, itemQuery] = item.href.split("?");
          let active = false;
          if (item.href === "/") {
            active = pathname === "/";
          } else if (itemQuery) {
            if (typeof window !== "undefined") {
              const searchParams = new URLSearchParams(window.location.search);
              const itemParams = new URLSearchParams(itemQuery);
              let allMatch = pathname === itemPath;
              itemParams.forEach((val, key) => {
                if (searchParams.get(key) !== val) allMatch = false;
              });
              active = allMatch;
            } else {
              active = pathname === itemPath;
            }
          } else {
            const isPrefixed = pathname.startsWith(item.href);
            if (isPrefixed) {
              const hasLongerMatch = visible.some(
                (other) =>
                  other.href !== item.href &&
                  pathname.startsWith(other.href) &&
                  other.href.length > item.href.length
              );
              active = !hasLongerMatch;
            } else {
              active = false;
            }
          }
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-[var(--ease-out-expo)] border border-transparent",
                active
                  ? "bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] border-[var(--border)] border-l-[3px] border-l-[var(--purple)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5),0_0_12px_rgba(124,58,237,0.1)]"
                  : "text-[var(--sidebar-text)] hover:bg-zinc-800/50 hover:text-zinc-100 hover:translate-x-1"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110",
                  active ? "text-[var(--purple)]" : "group-hover:text-[var(--purple)] text-[var(--sidebar-text)]"
                )} />
                <span className="transition-colors duration-300">{item.title}</span>
              </div>
              {active && (
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--purple)] mr-1 shadow-[0_0_6px_var(--purple)] animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-4 space-y-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--sidebar-text)] hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>
        <div className="px-3">
          <p className="text-[10px] font-medium text-[var(--neutral-400)]">AntBox HRMS · v3.0</p>
          <p className="text-[10px] text-[var(--neutral-400)]/70">Bhubaneswar, Odisha</p>
        </div>
      </div>
    </aside>
  );
}
