import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmployeeTable } from "@/components/employees/EmployeeTable";

import type { Employee, Department } from "@prisma/client";

type EmployeeRow = Employee & { department: Department };

export default async function EmployeesPage() {
  let employees: EmployeeRow[] = [];

  try {
    employees = await prisma.employee.findMany({
      include: { department: true },
      orderBy: { createdAt: "desc" },
    }) as EmployeeRow[];
  } catch {
    // DB offline fallback
  }

  const count = employees.length || 8;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            PEOPLE DIRECTORY
          </p>
          <h2 className="text-3xl font-extrabold text-zinc-950 mt-1">
            Every <span className="italic-serif text-4xl font-light">teammate</span>,
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Find people by name, role, or department. Manage profiles, employment details and access.
          </p>
        </div>
        
        <Link
          href="/onboarding"
          className="flex items-center gap-1.5 self-start rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add employee
        </Link>
      </div>

      {/* Filters & Results Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <div className="flex flex-1 items-center gap-3 max-w-md">
          {/* Search Box */}
          <div className="relative flex-1 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-400">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, role, department..."
              className="bg-transparent text-xs outline-none placeholder:text-zinc-400 text-zinc-900 flex-1"
            />
          </div>
          {/* Filter Button */}
          <button className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-50">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
            Filters
          </button>
        </div>
        
        <span className="text-xs text-zinc-400 font-medium">
          {count} results
        </span>
      </div>

      {/* Table */}
      <EmployeeTable employees={employees} />
    </div>
  );
}
