"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, X, AlertCircle, CheckCircle2 } from "lucide-react";

interface Holiday {
  date: string;
  name: string;
}

interface CalendarLeave {
  date: string;
  type: string;
  label: string;
}

interface LeaveTypeOption {
  id: string;
  name: string;
  code: string;
}

interface Props {
  holidays: Holiday[];
  leaves: CalendarLeave[];
  leaveTypes: LeaveTypeOption[];
}

export function CompanyCalendarWidget({ holidays, leaves, leaveTypes }: Props) {
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [localLeaves, setLocalLeaves] = useState<CalendarLeave[]>(leaves);

  const monthStart = useMemo(() => startOfMonth(current), [current]);
  const monthEnd = useMemo(() => endOfMonth(current), [current]);
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const paddingDays = useMemo(() => monthStart.getDay(), [monthStart]);

  // Pre-compile holidays lookup map by yyyy-MM-dd key to avoid O(N) array scans and new Date() instantiation in render loop.
  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach((h) => {
      try {
        const d = new Date(h.date);
        if (!isNaN(d.getTime())) {
          const key = format(d, "yyyy-MM-dd");
          map.set(key, h);
        }
      } catch (e) {
        console.error("Invalid holiday date:", h.date, e);
      }
    });
    return map;
  }, [holidays]);

  // Pre-compile leaves lookup map by yyyy-MM-dd key to avoid O(N) array scans and new Date() instantiation in render loop.
  const leavesMap = useMemo(() => {
    const map = new Map<string, CalendarLeave[]>();
    localLeaves.forEach((l) => {
      try {
        const d = new Date(l.date);
        if (!isNaN(d.getTime())) {
          const key = format(d, "yyyy-MM-dd");
          if (!map.has(key)) {
            map.set(key, []);
          }
          map.get(key)!.push(l);
        }
      } catch (e) {
        console.error("Invalid leave date:", l.date, e);
      }
    });
    return map;
  }, [localLeaves]);

  const getHoliday = (d: Date) => {
    const key = format(d, "yyyy-MM-dd");
    return holidayMap.get(key);
  };

  const getDayLeaves = (d: Date) => {
    const key = format(d, "yyyy-MM-dd");
    return leavesMap.get(key) || [];
  };

  const openDialog = (d: Date) => {
    const past = d < new Date(new Date().setHours(0, 0, 0, 0));
    if (past) return;
    setSelected(d);
    setDialogOpen(true);
    setError(null);
    setSuccess(null);
    setLeaveTypeId(leaveTypes[0]?.id || "");
    setReason("");
  };

  async function submitLeave() {
    if (!selected || !leaveTypeId) return;
    const finalReason = reason.trim() || "Requested via calendar";
    if (finalReason.length < 5) {
      setError("Reason must be at least 5 characters long.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId,
          startDate: format(selected, "yyyy-MM-dd"),
          endDate: format(selected, "yyyy-MM-dd"),
          days: 1,
          reason: finalReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMsg = "Could not submit request.";
        if (data.error) {
          if (typeof data.error === "string") {
            errorMsg = data.error;
          } else if (typeof data.error === "object") {
            if (data.error.fieldErrors) {
              const fields = Object.entries(data.error.fieldErrors)
                .map(([field, msgs]) => {
                  const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
                  return `${fieldName}: ${(msgs as string[]).join(", ")}`;
                })
                .join("; ");
              if (fields) errorMsg = fields;
            } else if (data.error.formErrors && Array.isArray(data.error.formErrors) && data.error.formErrors.length > 0) {
              errorMsg = data.error.formErrors.join(", ");
            } else if (data.error.message) {
              errorMsg = data.error.message;
            } else {
              errorMsg = JSON.stringify(data.error);
            }
          }
        }
        setError(errorMsg);
        return;
      }
      const lt = leaveTypes.find((t) => t.id === leaveTypeId);
      setLocalLeaves((prev) => [
        ...prev,
        {
          date: format(selected, "yyyy-MM-dd"),
          type: lt?.code || "LEAVE",
          label: lt?.name || "Leave",
        },
      ]);
      setSuccess("Request submitted!");
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--purple)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            {format(current, "MMMM yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="rounded p-1 hover:bg-zinc-100 text-zinc-500"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="rounded p-1 hover:bg-zinc-100 text-zinc-500"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-zinc-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: paddingDays }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const holiday = getHoliday(day);
          const dayLeaves = getDayLeaves(day);
          const today = isToday(day);
          const inMonth = isSameMonth(day, current);
          const wfh = dayLeaves.some((l) => l.type === "WFH");
          const onLeave = dayLeaves.some((l) => l.type !== "WFH");

          return (
            <button
              key={day.toISOString()}
              onClick={() => openDialog(day)}
              className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-all hover:bg-zinc-50 ${
                today
                  ? "bg-[var(--purple)] text-white hover:bg-[var(--purple)]"
                  : holiday
                  ? "bg-amber-50 text-amber-700"
                  : wfh
                  ? "bg-emerald-50 text-emerald-700"
                  : onLeave
                  ? "bg-sky-50 text-sky-700"
                  : inMonth
                  ? "text-zinc-800"
                  : "text-zinc-300"
              }`}
            >
              {format(day, "d")}
              {(holiday || dayLeaves.length > 0) && (
                <span className={`mt-0.5 h-1 w-1 rounded-full ${today ? "bg-white/80" : holiday ? "bg-amber-400" : wfh ? "bg-emerald-400" : "bg-sky-400"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Holiday</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />Leave</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />WFH</span>
      </div>

      {/* Slot Dialog */}
      {dialogOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-zinc-900 text-sm">
                {format(selected, "EEEE, d MMMM yyyy")}
              </p>
              <button onClick={() => setDialogOpen(false)} className="rounded-lg p-1.5 hover:bg-zinc-100">
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>

            {success ? (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600">Type</label>
                    <select
                      value={leaveTypeId}
                      onChange={(e) => setLeaveTypeId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--purple)]/30"
                    >
                      {leaveTypes.map((lt) => (
                        <option key={lt.id} value={lt.id}>{lt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600">Reason (optional)</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--purple)]/30"
                      placeholder="Add a note…"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setDialogOpen(false)}
                    className="flex-1 rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitLeave}
                    disabled={submitting || !leaveTypeId}
                    className="flex-1 rounded-lg bg-[var(--purple)] py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Submitting…" : "Submit Request"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
