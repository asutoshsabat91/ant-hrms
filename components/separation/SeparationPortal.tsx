"use client";

import { useState } from "react";
import { format, isPast } from "date-fns";
import { DoorOpen, AlertCircle, CheckCircle2, Clock, XCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SeparationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

interface SeparationRecord {
  id: string;
  status: SeparationStatus;
  reason: string;
  noticeDays: number;
  initiatedAt: string;
  approvedAt: string | null;
  lastWorkingDate: string | null;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    designation: string;
    department: { name: string };
  };
}

interface Props {
  isAdmin: boolean;
  mySeparation: Omit<SeparationRecord, "employee"> | null;
  allSeparations: SeparationRecord[];
}

const STATUS_CONFIG: Record<SeparationStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  REJECTED: { label: "Not Approved", color: "bg-rose-100 text-rose-700", icon: XCircle },
  CANCELLED: { label: "Cancelled", color: "bg-zinc-100 text-zinc-500", icon: XCircle },
};

function StatusBadge({ status }: { status: SeparationStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

export function SeparationPortal({ isAdmin, mySeparation: initial, allSeparations: initialAll }: Props) {
  const [mySep, setMySep] = useState(initial);
  const [allSeps, setAllSeps] = useState(initialAll);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  async function initiate() {
    if (!reason.trim()) { setError("Please provide a reason."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/separation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed."); return; }
      setMySep(data.separation);
      setReason("");
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  async function adminAction(id: string, action: string, extra?: Record<string, unknown>) {
    setActionLoading(id + action);
    try {
      const res = await fetch(`/api/separation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed."); return; }
      if (data.separation) {
        setAllSeps((prev) => prev.map((s) => s.id === id ? { ...s, ...data.separation } : s));
      }
    } catch { alert("Something went wrong."); }
    finally { setActionLoading(null); }
  }

  async function cancelMine() {
    if (!mySep) return;
    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/separation/${mySep.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed."); return; }
      setMySep(data.separation);
    } finally { setActionLoading(null); }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl space-y-6">
        {!mySep || mySep.status === "CANCELLED" || mySep.status === "REJECTED" ? (
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 space-y-4">
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-[var(--purple)]" />
              <p className="text-sm font-bold text-zinc-900">Submit Resignation</p>
            </div>
            <p className="text-xs text-zinc-500">
              Once submitted, your manager and HR will review your request. A 10-day notice period applies upon approval.
            </p>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Reason for Resignation</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="mt-1 resize-none"
                placeholder="Please share your reason for leaving…"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" />{error}
              </div>
            )}
            <Button onClick={initiate} disabled={loading} size="sm">
              {loading ? "Submitting…" : "Initiate Resignation"}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-zinc-900">Your Resignation</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Submitted {format(new Date(mySep.initiatedAt), "dd MMM yyyy")}
                </p>
              </div>
              <StatusBadge status={mySep.status} />
            </div>

            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Reason</p>
              <p className="text-sm text-zinc-700 mt-0.5">{mySep.reason}</p>
            </div>

            {mySep.status === "APPROVED" && mySep.lastWorkingDate && (
              <div className={`rounded-xl border-2 p-4 ${isPast(new Date(mySep.lastWorkingDate)) ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
                <p className="text-xs font-bold text-zinc-600">Last Working Day</p>
                <p className="text-xl font-bold text-zinc-900 mt-1">
                  {format(new Date(mySep.lastWorkingDate), "EEEE, dd MMMM yyyy")}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {mySep.noticeDays}-day notice period · Approved {mySep.approvedAt ? format(new Date(mySep.approvedAt), "dd MMM") : ""}
                </p>
              </div>
            )}

            {mySep.status === "PENDING" && (
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                disabled={actionLoading === "cancel"}
                onClick={cancelMine}
              >
                Cancel Resignation
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Admin view
  return (
    <div className="space-y-4">
      {allSeps.length === 0 && (
        <p className="text-sm text-zinc-400 py-8 text-center">No resignation requests on record.</p>
      )}
      {allSeps.map((sep) => (
        <div key={sep.id} className="rounded-xl border border-zinc-100 bg-white p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-zinc-900">
                {sep.employee?.firstName} {sep.employee?.lastName}
                <span className="ml-2 text-xs font-normal text-zinc-400">({sep.employee?.employeeId})</span>
              </p>
              <p className="text-xs text-zinc-500">{sep.employee?.designation} · {sep.employee?.department.name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Submitted {format(new Date(sep.initiatedAt), "dd MMM yyyy")}</p>
            </div>
            <StatusBadge status={sep.status} />
          </div>

          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Reason</p>
            <p className="text-sm text-zinc-700 mt-0.5">{sep.reason}</p>
          </div>

          {sep.status === "APPROVED" && sep.lastWorkingDate && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs font-semibold text-emerald-800">
                Last Working Day: {format(new Date(sep.lastWorkingDate), "dd MMM yyyy")}
              </p>
            </div>
          )}

          {sep.status === "PENDING" && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 gap-1"
                disabled={actionLoading === sep.id + "approve"}
                onClick={() => adminAction(sep.id, "approve")}
              >
                <CheckCircle2 className="h-3 w-3" /> Approve
              </Button>
              <div className="flex items-center gap-2">
                <input
                  className="h-7 rounded border border-zinc-200 px-2 text-xs w-44"
                  placeholder="Rejection reason (optional)"
                  value={rejectReason[sep.id] ?? ""}
                  onChange={(e) => setRejectReason((p) => ({ ...p, [sep.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                  disabled={actionLoading === sep.id + "reject"}
                  onClick={() => adminAction(sep.id, "reject", { rejectionReason: rejectReason[sep.id] })}
                >
                  <XCircle className="h-3 w-3" /> Reject
                </Button>
              </div>
            </div>
          )}

          {sep.status === "APPROVED" && sep.lastWorkingDate && isPast(new Date(sep.lastWorkingDate)) && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-violet-600 hover:bg-violet-700"
              disabled={actionLoading === sep.id + "complete_offboarding"}
              onClick={() => adminAction(sep.id, "complete_offboarding")}
            >
              <PlayCircle className="h-3 w-3" /> Initiate Offboarding
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
