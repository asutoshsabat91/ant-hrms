import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { EmployeeDirectoryClient } from "@/components/employees/EmployeeDirectoryClient";

import type { Employee, Department } from "@prisma/client";

type EmployeeRow = Employee & { department: Department };

export default async function EmployeesPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "ADMIN";
  const isCompanyAdmin = session?.user?.role === "COMPANY_ADMIN";
  const managedCompany = session?.user?.managedCompany;

  let employees: EmployeeRow[] = [];

  try {
    let whereClause = {};
    if (isCompanyAdmin && managedCompany) {
      whereClause = { deployedCompany: managedCompany };
    }
    employees = await prisma.employee.findMany({
      where: whereClause,
      include: { department: true },
      orderBy: { createdAt: "desc" },
    }) as EmployeeRow[];
  } catch {
    // DB offline fallback
  }

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
        
        {isSuperAdmin && (
          <Link
            href="/onboarding"
            className="flex items-center gap-1.5 self-start rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add employee
          </Link>
        )}
      </div>

      {/* Directory with search and filters */}
      <EmployeeDirectoryClient employees={employees} userRole={session?.user?.role} />
    </div>
  );
}
