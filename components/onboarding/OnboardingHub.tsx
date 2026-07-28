"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CalendarDays, ClipboardCheck, ArrowRight, UserCheck, ShieldAlert, Award, CreditCard, FileText } from "lucide-react";

export interface OnboardingEmployee {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
  jobRole?: string | null;
  employeeId: string;
  joiningDate: string;
  department: { name: string };
  manager?: { firstName: string; lastName: string } | null;
  hasIdProof: boolean;
  hasBanking: boolean;
  hasIdForm: boolean;
  status: string;
}

interface OnboardingHubProps {
  employees: OnboardingEmployee[];
}

export function OnboardingHub({ employees }: OnboardingHubProps) {
  const [viewMode, setViewMode] = useState<"ONBOARDING" | "COMPLETED">("ONBOARDING");

  // Filter employees based on selection
  const filteredEmployees = employees.filter((emp) =>
    viewMode === "ONBOARDING" ? emp.status === "ONBOARDING" : emp.status === "ACTIVE"
  );

  // Group into stages
  const invited = filteredEmployees.filter((emp) => !emp.hasIdProof);
  const bankingPending = filteredEmployees.filter((emp) => emp.hasIdProof && !emp.hasBanking);
  const idFormPending = filteredEmployees.filter((emp) => emp.hasIdProof && emp.hasBanking && !emp.hasIdForm);
  const readyToApprove = filteredEmployees.filter((emp) => emp.hasIdProof && emp.hasBanking && emp.hasIdForm);

  const stages = [
    {
      title: "1. Docs Pending",
      count: invited.length,
      employees: invited,
      icon: FileText,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "2. Bank Pending",
      count: bankingPending.length,
      employees: bankingPending,
      icon: CreditCard,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      title: "3. ID Form Pending",
      count: idFormPending.length,
      employees: idFormPending,
      icon: Award,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      title: "4. Ready / Done",
      count: readyToApprove.length,
      employees: readyToApprove,
      icon: ClipboardCheck,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-150 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("ONBOARDING")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-2.5 ${
              viewMode === "ONBOARDING"
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Active Onboarding ({employees.filter(e => e.status === "ONBOARDING").length})
          </button>
          <button
            onClick={() => setViewMode("COMPLETED")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-2.5 ${
              viewMode === "COMPLETED"
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Completed / Active ({employees.filter(e => e.status === "ACTIVE").length})
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Real-Time Milestone Sync</span>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage) => {
          const StageIcon = stage.icon;
          return (
            <div key={stage.title} className="flex flex-col min-h-[420px] bg-zinc-50/50 rounded-2xl border border-zinc-200/80 p-4">
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${stage.color}`}>
                    <StageIcon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-extrabold text-zinc-800 tracking-tight">{stage.title}</h3>
                </div>
                <span className="rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-600 shadow-sm">
                  {stage.count}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
                {stage.employees.map((emp) => {
                  const doneCount = [emp.hasIdProof, emp.hasBanking, emp.hasIdForm].filter(Boolean).length;
                  return (
                    <Link
                      key={emp.id}
                      href={`/onboarding/${emp.id}`}
                      className="group block bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm hover:border-zinc-400 hover:shadow-md transition-all duration-300"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-800 group-hover:text-zinc-950 transition-colors">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium truncate">
                          {emp.jobRole || emp.designation} · {emp.department.name}
                        </p>
                      </div>

                      {/* Milestone Checkboxes */}
                      <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                          <span>Milestones</span>
                          <span className={doneCount === 3 ? "text-emerald-600 font-extrabold" : "text-zinc-500"}>
                            {doneCount}/3 Done
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              emp.hasIdProof ? "bg-emerald-500" : "bg-zinc-200"
                            }`}
                            title={`Milestone 1 (Documents): ${emp.hasIdProof ? "Completed" : "Pending"}`}
                          />
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              emp.hasBanking ? "bg-emerald-500" : "bg-zinc-200"
                            }`}
                            title={`Milestone 2 (Banking): ${emp.hasBanking ? "Completed" : "Pending"}`}
                          />
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              emp.hasIdForm ? "bg-emerald-500" : "bg-zinc-200"
                            }`}
                            title={`Milestone 3 (ID Form): ${emp.hasIdForm ? "Completed" : "Pending"}`}
                          />
                        </div>

                        <div className="mt-3 pt-1 flex items-center justify-between text-[9px] text-zinc-400 font-medium">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3 shrink-0 text-zinc-400" />
                            {format(parseISO(emp.joiningDate), "dd MMM")}
                          </span>
                          <span className="flex items-center gap-0.5 text-zinc-500 font-bold group-hover:text-zinc-950 transition-colors">
                            Manage <ArrowRight className="h-2.5 w-2.5 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {stage.employees.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-200 rounded-2xl">
                    <ShieldAlert className="h-5 w-5 text-zinc-300 mb-1.5 animate-pulse" />
                    <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">No hires in stage</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
