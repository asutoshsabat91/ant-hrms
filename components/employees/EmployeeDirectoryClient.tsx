"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { EmployeeTable } from "./EmployeeTable";
import type { Employee, Department, EmployeeStatus, EmploymentType } from "@prisma/client";

type EmployeeRow = Employee & { department: Department };

interface Props {
  employees: EmployeeRow[];
}

export function EmployeeDirectoryClient({ employees }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<EmploymentType | "ALL">("ALL");
  const [showFilters, setShowFilters] = useState(false);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Search term match
      const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const designation = (emp.designation || "").toLowerCase();
      const dept = (emp.department?.name || "").toLowerCase();
      const email = (emp.email || "").toLowerCase();
      const id = (emp.employeeId || "").toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        query === "" ||
        name.includes(query) ||
        designation.includes(query) ||
        dept.includes(query) ||
        email.includes(query) ||
        id.includes(query);

      // 2. Status match
      const matchesStatus = statusFilter === "ALL" || emp.status === statusFilter;

      // 3. Type match
      const matchesType = typeFilter === "ALL" || emp.employmentType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [employees, searchTerm, statusFilter, typeFilter]);

  const count = filteredEmployees.length;

  return (
    <div className="space-y-6">
      {/* Search & Filters Controls Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center max-w-2xl">
          {/* Search Box */}
          <div className="relative flex-1 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-400">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, role, department..."
              className="bg-transparent text-xs outline-none placeholder:text-zinc-400 text-zinc-900 flex-1"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
              showFilters
                ? "bg-zinc-900 border-zinc-900 text-white"
                : "bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {(statusFilter !== "ALL" || typeFilter !== "ALL") && (
              <span className="ml-1 rounded-full bg-indigo-500 text-white px-1.5 py-0.2 text-[9px] font-bold">
                !
              </span>
            )}
          </button>
        </div>

        <span className="text-xs text-zinc-400 font-medium">
          {count} results
        </span>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="rounded-xl border border-zinc-150 bg-zinc-50/50 p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 animate-in fade-in slide-in-from-top-2 duration-250">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EmployeeStatus | "ALL")}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 outline-none focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/40"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="OFFBOARDING">Offboarding</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Employment Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as EmploymentType | "ALL")}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 outline-none focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/40"
            >
              <option value="ALL">All Types</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="EMPLOYEE">Intern</option>
              <option value="CONTRACT">Contract</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setTypeFilter("ALL");
                setSearchTerm("");
              }}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 pb-2.5 hover:underline"
            >
              Reset all filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <EmployeeTable employees={filteredEmployees} />
    </div>
  );
}
