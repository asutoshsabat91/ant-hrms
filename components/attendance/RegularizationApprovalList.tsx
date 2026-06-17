"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, X, Loader2, Calendar, Clock, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

interface RegularizationRequest {
  id: string;
  employeeId: string;
  date: string;
  type: string;
  clockIn: string | null;
  clockOut: string | null;
  reason: string;
  status: string;
  createdAt: string;
  employee: Employee;
}

interface Props {
  initialRequests: RegularizationRequest[];
}

export function RegularizationApprovalList({ initialRequests }: Props) {
  const [requests, setRequests] = useState<RegularizationRequest[]>(initialRequests);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setProcessingId(id);
    setMessage(null);

    let comment = "";
    if (action === "reject") {
      const reason = prompt("Please enter a reason for rejection (required):");
      if (reason === null) {
        setProcessingId(null);
        return; // User cancelled
      }
      if (!reason.trim()) {
        setMessage({ text: "Rejection comment is compulsory.", ok: false });
        setProcessingId(null);
        return;
      }
      comment = reason;
    }

    try {
      const res = await fetch(`/api/attendance/regularize/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      const data = await res.json();
      setMessage({
        text: res.ok ? `Request successfully ${action === "approve" ? "approved" : "rejected"}!` : data.error || "Failed to process request.",
        ok: res.ok,
      });
      if (res.ok) {
        setRequests((current) => current.filter((r) => r.id !== id));
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch {
      setMessage({ text: "Network error occurred.", ok: false });
    } finally {
      setProcessingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-400">
        <Check className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
        <p className="text-xs font-bold text-zinc-800">All caught up!</p>
        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">No pending regularization requests require approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {requests.map((req) => {
          const name = `${req.employee.firstName} ${req.employee.lastName}`;
          const initials = `${req.employee.firstName[0]}${req.employee.lastName[0]}`;
          const workDate = new Date(req.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC"
          });
          const timeIn = req.clockIn ? format(new Date(req.clockIn), "hh:mm a") : "—";
          const timeOut = req.clockOut ? format(new Date(req.clockOut), "hh:mm a") : "—";

          return (
            <div
              key={req.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 hover:border-zinc-300 transition-all"
            >
              {/* Request User Header */}
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-zinc-100">
                  <AvatarFallback className="bg-zinc-100 text-zinc-800 text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-bold text-zinc-950">{name}</p>
                  <p className="text-[10px] text-zinc-400 font-semibold">{req.employee.employeeId}</p>
                </div>
              </div>

              {/* Request Details */}
              <div className="rounded-xl bg-zinc-50/50 border border-zinc-150 p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400 inline-flex items-center gap-1 font-semibold"><Calendar className="h-3.5 w-3.5" /> Date:</span>
                  <span className="font-bold text-zinc-900">{workDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 inline-flex items-center gap-1 font-semibold"><AlertCircle className="h-3.5 w-3.5" /> Type:</span>
                  <span className="font-bold text-zinc-900 capitalize">{req.type.replaceAll("_", " ")}</span>
                </div>
                {["BOTH", "CLOCK_IN", "CLOCK_OUT"].includes(req.type) && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400 inline-flex items-center gap-1 font-semibold"><Clock className="h-3.5 w-3.5" /> Proposed Shift:</span>
                    <span className="font-bold text-zinc-900">
                      {timeIn} — {timeOut}
                    </span>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Employee Reason:</span>
                <p className="text-xs font-medium text-zinc-700 bg-zinc-50 border border-zinc-100 p-2.5 rounded-lg italic">
                  &quot;{req.reason}&quot;
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  onClick={() => handleAction(req.id, "reject")}
                  disabled={processingId === req.id}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {processingId === req.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => handleAction(req.id, "approve")}
                  disabled={processingId === req.id}
                  className="flex items-center gap-1 rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {processingId === req.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span>Approve</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
