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
}

// Static mock data — defined outside component so it never re-creates
const DEFAULT_REQUESTS: LeaveRequestItem[] = [
  {
    id: "mock-1",
    employee: { firstName: "Karthik", lastName: "Reddy", employeeId: "LV-101" },
    leaveType: { name: "Earned Leave" },
    startDate: "2026-06-10",
    endDate: "2026-06-14",
    days: 5,
    status: "PENDING",
    reason: "Family vacation to Hill Station",
  },
  {
    id: "mock-2",
    employee: { firstName: "Ishita", lastName: "Sen", employeeId: "LV-102" },
    leaveType: { name: "Sick Leave" },
    startDate: "2026-06-06",
    endDate: "2026-06-06",
    days: 1,
    status: "APPROVED",
    reason: "Severe fever and doctor appointment",
  },
  {
    id: "mock-3",
    employee: { firstName: "Devansh", lastName: "Bhatia", employeeId: "LV-103" },
    leaveType: { name: "Casual Leave" },
    startDate: "2026-06-20",
    endDate: "2026-06-21",
    days: 2,
    status: "PENDING",
    reason: "Urgent personal work at home town",
  },
  {
    id: "mock-4",
    employee: { firstName: "Maya", lastName: "Krishnan", employeeId: "LV-104" },
    leaveType: { name: "Sprint Leave" },
    startDate: "2026-07-02",
    endDate: "2026-07-05",
    days: 4,
    status: "APPROVED",
    reason: "Moving houses and setup",
  },
];

export function LeavePageClient({ initialData, leaveTypes, userRole }: LeavePageClientProps) {
  const [requests, setRequests] = useState<LeaveRequestItem[]>(initialData.recentRequests);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>(initialData.leaveBalances);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = useCallback(() => setIsDialogOpen(true), []);

  const displayRequests = useMemo(() => {
    return requests.length > 0 ? requests : (userRole === "SUPER_ADMIN" ? DEFAULT_REQUESTS : []);
  }, [requests, userRole]);

  // Memoize balance cards — only recalculates when balances change
  const balancesData = useMemo(() => {
    const getInfo = (typeCode: string) => {
      const balance = balances.find((b) => b.leaveType.code === typeCode);
      if (balance) {
        const allocated = balance.allocated || 0;
        const used = balance.used || 0;
        const remaining = allocated - used;
        return { allocated, used, remaining, percent: allocated > 0 ? (remaining / allocated) * 100 : 75 };
      }
      if (typeCode === "PL") return { allocated: 24, used: 6, remaining: 18, percent: 75 };
      if (typeCode === "SL") return { allocated: 12, used: 3, remaining: 9, percent: 75 };
      if (typeCode === "CL") return { allocated: 8, used: 2, remaining: 6, percent: 75 };
      if (typeCode === "WFH") return { allocated: 0, used: 0, remaining: 0, percent: 0 };
      return { allocated: 5, used: 0, remaining: 5, percent: 100 };
    };

    if (userRole === "SUPER_ADMIN") {
      return [
        { label: "EARNED LEAVE", code: "PL", ...getInfo("PL") },
        { label: "SICK LEAVE", code: "SL", ...getInfo("SL") },
        { label: "CASUAL LEAVE", code: "CL", ...getInfo("CL") },
        { label: "SPRINT LEAVE", code: "SPRINT", ...getInfo("SPRINT") },
      ];
    }

    return [
      { label: "EARNED LEAVE", code: "PL", ...getInfo("PL") },
      { label: "SICK LEAVE", code: "SL", ...getInfo("SL") },
      { label: "CASUAL LEAVE", code: "CL", ...getInfo("CL") },
      { label: "WORK FROM HOME (WFH)", code: "WFH", ...getInfo("WFH") },
    ];
  }, [balances, userRole]);

  // Memoize the leave-taken map — only recalculates when displayRequests changes
  const leavesTakenByEmployee = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of displayRequests) {
      if (r.status === "APPROVED") {
        const key = r.employee.employeeId;
        map[key] = (map[key] || 0) + (r.days || 0);
      }
    }
    return map;
  }, [displayRequests]);

  const handleDecision = useCallback(
    async (id: string, action: "APPROVE" | "REJECT") => {
      if (id.startsWith("mock-")) {
        setRequests((current) => {
          const base = current.length === 0 ? DEFAULT_REQUESTS : current;
          return base.map((r) =>
            r.id === id ? { ...r, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : r
          );
        });
        return;
      }
      try {
        const response = await fetch(`/api/leave/requests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (response.ok) {
          setRequests((current) =>
            current.map((r) =>
              r.id === id ? { ...r, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : r
            )
          );
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
          if (item.code === "WFH") {
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
                    <span className="text-xs font-medium text-zinc-400">days taken</span>
                  </p>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-zinc-400">
                    Tracked work from home days
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
                  {userRole === "SUPER_ADMIN" ? (
                    <th scope="col" className="px-6 py-4">Employee</th>
                  ) : (
                    <th scope="col" className="px-6 py-4">Reason</th>
                  )}
                  <th scope="col" className="px-6 py-4">Type</th>
                  <th scope="col" className="px-6 py-4">From</th>
                  <th scope="col" className="px-6 py-4">To</th>
                  <th scope="col" className="px-6 py-4">Days</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  {userRole === "SUPER_ADMIN" && (
                    <>
                      <th scope="col" className="px-6 py-4 text-right w-40">Actions</th>
                      <th scope="col" className="px-6 py-4 w-10"></th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {displayRequests.map((req) => {
                  const name = `${req.employee.firstName} ${req.employee.lastName}`;
                  const initials = `${req.employee.firstName[0]}${req.employee.lastName[0]}`;
                  const startStr = format(new Date(req.startDate), "MMM dd");
                  const endStr = format(new Date(req.endDate), "MMM dd");
                  const totalLeavesTaken = leavesTakenByEmployee[req.employee.employeeId] || 0;

                  return (
                    <tr key={req.id} className="hover:bg-zinc-50/50 transition-colors">
                      {userRole === "SUPER_ADMIN" ? (
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
                                {req.employee.employeeId || "LV-100"}
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
                        {req.leaveType.name}
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
                      {userRole === "SUPER_ADMIN" && (
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
                                      Total Leaves Taken
                                    </p>
                                    <p className="text-sm font-extrabold text-zinc-900">
                                      {totalLeavesTaken} days
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
      />
    </div>
  );
}
