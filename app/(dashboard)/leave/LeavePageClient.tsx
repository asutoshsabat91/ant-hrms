"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { format } from "date-fns";
import { Plus, MoreHorizontal, CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApplyLeaveDialog } from "@/components/leave/ApplyLeaveDialog";

// Isolated component — only THIS suspends, not the entire page
function SearchParamsHandler({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("employeeId")) {
      onOpen();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

interface LeaveBalanceItem {
  leaveType: {
    code: string;
    name: string;
  };
  allocated?: number;
  used?: number;
  pending?: number;
}

interface LeaveRequestItem {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  leaveType: {
    name: string;
  };
  startDate: string | Date;
  endDate: string | Date;
  days: number;
  status: string;
  reason?: string;
  paidLeavesLeft?: number;
}

interface LeaveTypeItem {
  id: string;
  name: string;
  code?: string;
}

interface LeavePageClientProps {
  initialData: {
    year: number;
    leaveBalances: LeaveBalanceItem[];
    recentRequests: LeaveRequestItem[];
    counts: Record<string, number>;
  };
  leaveTypes: LeaveTypeItem[];
  userRole: string;
  employmentType: string;
  isManager?: boolean;
}

export function LeavePageClient({ initialData, leaveTypes, userRole, employmentType, isManager }: LeavePageClientProps) {
  const [requests, setRequests] = useState<LeaveRequestItem[]>(initialData.recentRequests);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>(initialData.leaveBalances);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canApprove = userRole === "ADMIN" || !!isManager;

  const openDialog = useCallback(() => setIsDialogOpen(true), []);

  const displayRequests = useMemo(() => {
    return requests;
  }, [requests]);

  // Memoize balance cards — only recalculates when balances change
  const balancesData = useMemo(() => {
    const getInfo = (typeCode: string) => {
      const balance = (balances || []).find((b) => b?.leaveType?.code === typeCode);
      if (balance) {
        const allocated = balance.allocated || 0;
        const used = balance.used || 0;
        const pending = balance.pending || 0;
        const remaining = Math.max(0, allocated - used - pending);
        return { allocated, used, pending, remaining, percent: allocated > 0 ? (remaining / allocated) * 100 : 0 };
      }
      return { allocated: 0, used: 0, pending: 0, remaining: 0, percent: 0 };
    };

    if (employmentType === "INTERN") {
      return [
        { label: "PAID/QUARTER LEAVES", code: "PAID_QUARTER", ...getInfo("PAID_QUARTER"), isUnlimited: false },
        { label: "OPTIONAL HOLIDAY", code: "OPTIONAL_HOLIDAY", ...getInfo("OPTIONAL_HOLIDAY"), isUnlimited: false },
        { label: "ACADEMIC LEAVES", code: "ACADEMIC", ...getInfo("ACADEMIC"), isUnlimited: true },
        { label: "WORK FROM HOME", code: "WFH", ...getInfo("WFH"), isUnlimited: true },
        { label: "LOSS OF PAY", code: "LOP", ...getInfo("LOP"), isUnlimited: true },
      ];
    }

    return [
      { label: "EARNED LEAVES", code: "EARNED", ...getInfo("EARNED"), isUnlimited: false },
      { label: "OPTIONAL HOLIDAY", code: "OPTIONAL_HOLIDAY", ...getInfo("OPTIONAL_HOLIDAY"), isUnlimited: false },
      { label: "FLOATER", code: "FLOATER", ...getInfo("FLOATER"), isUnlimited: false },
      { label: "BEREAVEMENT LEAVE", code: "BEREAVEMENT", ...getInfo("BEREAVEMENT"), isUnlimited: false },
      { label: "COMP-OFF LEAVE", code: "COMP_OFF", ...getInfo("COMP_OFF"), isUnlimited: true },
      { label: "WORK FROM HOME", code: "WFH", ...getInfo("WFH"), isUnlimited: true },
    ];
  }, [balances, employmentType]);

  // Memoize the leave-taken map — only recalculates when displayRequests changes
  const leavesTakenByEmployee = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of displayRequests) {
      if (r.status === "APPROVED" && r.employee?.employeeId) {
        const key = r.employee.employeeId;
        map[key] = (map[key] || 0) + (r.days || 0);
      }
    }
    return map;
  }, [displayRequests]);

  const handleDecision = useCallback(
    async (id: string, action: "APPROVE" | "REJECT") => {
      let rejectionReason = "";
      if (action === "REJECT") {
        const note = window.prompt("Please enter a reason for declining this leave request (required):");
        if (note === null) return; // Cancelled
        if (!note.trim()) {
          alert("Rejection reason is required.");
          return;
        }
        rejectionReason = note.trim();
      }
      try {
        const response = await fetch(`/api/leave/requests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, rejectionReason }),
        });
        if (response.ok) {
          setRequests((current) =>
            current.map((r) =>
              r.id === id ? { ...r, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : r
            )
          );
        } else {
          const errData = await response.json();
          alert(errData.error || "Failed to update leave request");
        }
      } catch (err) {
        console.error("Failed to approve/decline leave request", err);
      }
    },
    []
  );

  const handleSuccess = useCallback(
    (freshRequests: LeaveRequestItem[], freshBalances: LeaveBalanceItem[]) => {
      setRequests(freshRequests);
      setBalances(freshBalances);
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            TIME OFF
          </p>
          <h2 className="text-3xl font-extrabold text-zinc-950 mt-1">
            Time to <span className="italic-serif text-4xl font-light">recharge</span>.
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Track your balances, request leave and approve incoming requests — all in one view.
          </p>
        </div>

        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-1.5 self-start rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Apply for leave
        </button>
      </div>


      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balancesData.map((item) => {
          if (item.isUnlimited) {
            return (
              <div
                key={item.label}
                className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col justify-between h-[130px]"
              >
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    {item.label}
                  </p>
                  <p className="text-2xl font-bold text-zinc-950 mt-1.5">
                    {item.used}{" "}
                    <span className="text-xs font-medium text-zinc-400">days used</span>
                  </p>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-zinc-400">
                    Unlimited leave category
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.label}
              className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col justify-between h-[130px]"
            >
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  {item.label}
                </p>
                <p className="text-2xl font-bold text-zinc-950 mt-1.5">
                  {item.remaining}{" "}
                  <span className="text-xs font-medium text-zinc-400">/ {item.allocated} days</span>
                </p>
              </div>
              <div className="mt-3">
                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-950 rounded-full transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <p className="text-[9px] font-semibold text-zinc-400 mt-2">
                  {item.used} days used
                </p>
              </div>
            </div>
          );
        })}

      </div>

      {/* Table Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900">Leave requests</h3>
          <span className="text-xs text-zinc-400 font-medium">
            {displayRequests.length} request{displayRequests.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-zinc-500">
              <thead className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <tr>
                  {canApprove ? (
                    <th scope="col" className="px-6 py-4">Employee</th>
                  ) : (
                    <th scope="col" className="px-6 py-4">Reason</th>
                  )}
                  <th scope="col" className="px-6 py-4">Type</th>
                  <th scope="col" className="px-6 py-4">From</th>
                  <th scope="col" className="px-6 py-4">To</th>
                  <th scope="col" className="px-6 py-4">Days</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  {canApprove && (
                    <>
                      <th scope="col" className="px-6 py-4 text-right w-40">Actions</th>
                      <th scope="col" className="px-6 py-4 w-10"></th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {displayRequests.map((req) => {
                  if (!req) return null;
                  const emp = req.employee || { firstName: "", lastName: "", employeeId: "" };
                  const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown Employee";
                  const initials = `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase() || "??";
                  const startDateObj = req.startDate ? new Date(req.startDate) : null;
                  const endDateObj = req.endDate ? new Date(req.endDate) : null;
                  const startStr = startDateObj && !isNaN(startDateObj.getTime()) ? format(startDateObj, "MMM dd") : "—";
                  const endStr = endDateObj && !isNaN(endDateObj.getTime()) ? format(endDateObj, "MMM dd") : "—";
                  const totalLeavesTaken = emp.employeeId ? (leavesTakenByEmployee[emp.employeeId] || 0) : 0;

                  return (
                    <tr key={req.id} className="hover:bg-zinc-50/50 transition-colors">
                      {canApprove ? (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-zinc-100">
                              <AvatarFallback className="bg-zinc-100 text-zinc-800 text-xs font-bold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-zinc-900 leading-tight">{name}</p>
                              <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                                {emp.employeeId || "LV-100"}
                              </p>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <td className="px-6 py-4 text-xs font-semibold text-zinc-900 max-w-[220px] truncate" title={req.reason}>
                          {req.reason || "No reason provided"}
                        </td>
                      )}
                      <td className="px-6 py-4 text-xs font-semibold text-zinc-900">
                        {req.leaveType?.name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-zinc-900">{startStr}</td>
                      <td className="px-6 py-4 text-xs font-medium text-zinc-900">{endStr}</td>
                      <td className="px-6 py-4 text-xs font-medium text-zinc-900">{req.days}</td>
                      <td className="px-6 py-4">
                        {req.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            <span className="h-1 w-1 rounded-full bg-emerald-500" />
                            Approved
                          </span>
                        ) : req.status === "REJECTED" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/60 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                            <span className="h-1 w-1 rounded-full bg-rose-500" />
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                            <span className="h-1 w-1 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        )}
                      </td>
                      {canApprove && (
                        <>
                          <td className="px-6 py-4 text-right">
                            {req.status === "PENDING" ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => handleDecision(req.id, "REJECT")}
                                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                                >
                                  Decline
                                </button>
                                <button
                                  onClick={() => handleDecision(req.id, "APPROVE")}
                                  className="rounded-lg bg-zinc-950 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-zinc-800 transition-colors"
                                >
                                  Approve
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 font-medium pr-6">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="text-zinc-400 hover:text-zinc-900 transition-colors p-1 hover:bg-zinc-100 rounded-lg outline-none">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-56 bg-white border border-zinc-100 rounded-xl shadow-lg p-1"
                              >
                                <div className="px-3 py-2 border-b border-zinc-100 mb-1">
                                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    Employee Summary
                                  </p>
                                  <p className="text-xs font-bold text-zinc-900 mt-0.5">{name}</p>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2.5">
                                  <CalendarDays className="h-3.5 w-3.5 text-amber-600" />
                                  <div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                      Leaves Summary
                                    </p>
                                    <p className="text-xs font-semibold text-zinc-700">
                                      Taken: <span className="font-extrabold text-zinc-900">{totalLeavesTaken} days</span>
                                    </p>
                                    <p className="text-xs font-semibold text-zinc-700 mt-0.5">
                                      Paid Left: <span className="font-extrabold text-violet-600">{req.paidLeavesLeft ?? 0} days</span>
                                    </p>
                                  </div>
                                </div>
                                {req.status === "PENDING" && (
                                  <>
                                    <DropdownMenuSeparator className="bg-zinc-100" />
                                    <DropdownMenuItem
                                      onClick={() => handleDecision(req.id, "APPROVE")}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer font-medium"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Approve leave
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDecision(req.id, "REJECT")}
                                      className="flex items-center gap-2 px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer font-medium"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Decline leave
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SearchParams reader — isolated in Suspense so it doesn't block the page */}
      <Suspense fallback={null}>
        <SearchParamsHandler onOpen={openDialog} />
      </Suspense>

      {/* Apply Leave Dialog — uses createPortal, no backdrop-blur, no animation overhead */}
      <ApplyLeaveDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        leaveTypes={leaveTypes}
        onSuccess={handleSuccess}
        employmentType={employmentType}
      />

    </div>
  );
}
