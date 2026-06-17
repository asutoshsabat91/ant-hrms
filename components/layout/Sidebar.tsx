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
  BarChart3,
  Settings,
  LogOut,
  DoorOpen,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

const navItems: {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Employees", href: "/employees", icon: Users, roles: ["SUPER_ADMIN", "HR_ADMIN"] },
  { title: "Onboarding", href: "/onboarding", icon: UserPlus, roles: ["HR_ADMIN", "SUPER_ADMIN"] },
  { title: "Separation", href: "/separation", icon: DoorOpen },
  { title: "Offboarding", href: "/offboarding", icon: UserMinus, roles: ["HR_ADMIN", "SUPER_ADMIN"] },
  { title: "Attendance", href: "/attendance", icon: Clock },
  { title: "Leave", href: "/leave", icon: CalendarDays },
  {
    title: "Payroll",
    href: "/payroll",
    icon: Wallet,
    roles: ["HR_ADMIN", "SUPER_ADMIN"],
  },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Portal", href: "/portal", icon: Briefcase },
  { title: "POSH", href: "/posh", icon: ShieldCheck },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["HR_ADMIN", "SUPER_ADMIN", "MANAGER"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN"],
  },
];

interface SidebarProps {
  role: Role;
  gender?: string | null;
}

export function Sidebar({ role, gender }: SidebarProps) {
  const pathname = usePathname();

  const visible = navItems.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.href === "/posh" && gender?.toUpperCase() !== "FEMALE") return false;
    return true;
  });

  return (
    <aside className="flex h-full w-full flex-col bg-[var(--sidebar-bg)]">
      {/* Brand Logo Header */}
      <div className="flex h-16 items-center border-b border-[var(--border)] px-6 bg-white justify-start">
        <Image src="/logo.png" alt="AntBox Logo" width={110} height={28} className="object-contain" />
      </div>

      {/* Section Header */}
      <div className="px-5 py-2 mt-4 text-[10px] font-bold tracking-wider text-[var(--neutral-400)] uppercase">
        Workspace
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {visible.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-[var(--ease-out-expo)] border border-transparent",
                active
                  ? "bg-white text-[var(--sidebar-active-text)] border-[var(--border)] border-l-[3px] border-l-[var(--purple)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_0_12px_rgba(142,67,172,0.02)]"
                  : "text-[var(--sidebar-text)] hover:bg-zinc-200/30 hover:text-zinc-950 hover:translate-x-1"
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

      {/* Sidebar Footer */}
      <div className="border-t border-[var(--border)] p-4 space-y-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--sidebar-text)] hover:bg-zinc-200/50 hover:text-[var(--sidebar-active-text)] transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>
        <div className="px-3">
          <p className="text-[10px] font-medium text-[var(--neutral-400)]">
            AntBox HRMS · v2.4
          </p>
          <p className="text-[10px] text-[var(--neutral-400)]/70">
            Bhubaneswar, Odisha
          </p>
        </div>
      </div>
    </aside>
  );
}
