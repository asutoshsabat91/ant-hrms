"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import type { Employee, Department, EmployeeStatus } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EmployeeRow = Employee & { department: Department };

export function EmployeeTable({
  employees,
  userRole,
}: {
  employees: EmployeeRow[];
  userRole?: string;
}) {
  const router = useRouter();
  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case "ONBOARDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
            <span className="h-1 w-1 rounded-full bg-blue-500" />
            Onboarding
          </span>
        );
      case "OFFBOARDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-[10px] font-bold text-orange-700">
            <span className="h-1 w-1 rounded-full bg-orange-500" />
            Offboarding
          </span>
        );
      case "INACTIVE":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200/60 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Inactive
          </span>
        );
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-zinc-500">
          <thead className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <tr>
              <th scope="col" className="px-6 py-4">Employee</th>
              <th scope="col" className="px-6 py-4">Department</th>
              <th scope="col" className="px-6 py-4">Deployed Company</th>
              <th scope="col" className="px-6 py-4">Location</th>
              <th scope="col" className="px-6 py-4">Joined</th>
              <th scope="col" className="px-6 py-4">Status</th>
              <th scope="col" className="px-6 py-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-zinc-400">
                  No employees found. Run seed or add your first hire.
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const name = `${emp.firstName} ${emp.lastName}`;
                const initials = `${emp.firstName[0]}${emp.lastName[0]}`;
                const joinedDate = emp.joiningDate
                  ? format(new Date(emp.joiningDate), "MMM yyyy")
                  : "N/A";
                const locationStr = emp.city || "Bhubaneswar";
                return (
                  <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-zinc-100">
                          <AvatarFallback className="bg-zinc-100 text-zinc-800 text-xs font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          {userRole === "COMPANY_ADMIN" ? (
                            <span className="font-bold text-zinc-900 leading-tight block">
                              {name}
                            </span>
                          ) : (
                            <Link
                               href={`/employees/${emp.id}`}
                               className="font-bold text-zinc-900 hover:underline leading-tight block"
                            >
                              {name}
                            </Link>
                          )}
                          <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                            {emp.jobRole || emp.designation} · {emp.employeeId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-zinc-900">
                      {emp.department.name}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-zinc-900">
                      {emp.deployedCompany ? (
                        <span className="inline-flex items-center rounded-md bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-700/10">
                          {emp.deployedCompany}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-zinc-900">
                      {locationStr}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-zinc-900">
                      {joinedDate}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(emp.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="text-zinc-400 hover:text-zinc-900 transition-colors p-1 hover:bg-zinc-100 rounded-lg outline-none">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-white border border-zinc-100 rounded-xl shadow-lg p-1">
                          {userRole !== "COMPANY_ADMIN" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => router.push(`/employees/${emp.id}`)}
                                className="flex items-center px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 rounded-lg cursor-pointer font-medium"
                              >
                                View profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/offboarding?employeeId=${emp.id}`)}
                                className="flex items-center px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 rounded-lg cursor-pointer font-medium"
                              >
                                Initiate offboarding
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => router.push(`/leave?employeeId=${emp.id}`)}
                            className="flex items-center px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 rounded-lg cursor-pointer font-medium"
                          >
                            Apply for leave
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
