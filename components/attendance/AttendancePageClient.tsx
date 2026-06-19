"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock, Loader2, Calendar, Check, X } from "lucide-react";
import { AttendanceCard } from "@/components/dashboard/AttendanceCard";

type PunchType = "IN" | "OUT";

type Punch = {
  id: string;
  punchType: PunchType;
  punchedAt: string;
  location?: string | null;
  device?: string | null;
};

type AttendancePayload = {
  record: {
    id: string;
    totalHours: number | null;
    status: string;
  } | null;
  punches: Punch[];
  nextAction: "PUNCH_IN" | "PUNCH_OUT";
  totalHours: number;
  isIncomplete: boolean;
  hoursThisSession?: number | null;
};

type ApiEnvelope = {
  success: boolean;
  data: AttendancePayload;
  message: string;
};

type Cycle = {
  id: string;
  inTime: string;
  outTime: string | null;
  duration: string;
  location?: string | null;
  device?: string | null;
};

type HistoryRequest = {
  id: string;
  date: string;
  status: string;
  type: string;
  reason: string | null;
};

export function AttendancePageClient() {
  const [payload, setPayload] = useState<AttendancePayload | null>(null);

  // Regularization states
  const [isRegularizeOpen, setIsRegularizeOpen] = useState(false);
  const [regDate, setRegDate] = useState(new Date().toISOString().slice(0, 10));
  const [regType, setRegType] = useState<"CLOCK_IN" | "CLOCK_OUT" | "BOTH" | "REMOTE" | "LEAVE">("BOTH");
  const [regClockIn, setRegClockIn] = useState("09:00");
  const [regClockOut, setRegClockOut] = useState("18:00");
  const [regReason, setRegReason] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regMessage, setRegMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Fetch employee request history
  const [history, setHistory] = useState<HistoryRequest[]>([]);

  async function loadData() {
    try {
      const response = await fetch("/api/attendance");
      const envelope = (await response.json()) as ApiEnvelope;
      if (response.ok && envelope.success) {
        setPayload(envelope.data);
      }
    } catch {
      // Ignored
    }
  }

  async function loadHistory() {
    try {
      const response = await fetch("/api/attendance/regularize");
      const data = await response.json();
      if (response.ok && data.success) {
        setHistory(data.requests);
      }
    } catch {
      // Ignored
    }
  }

  useEffect(() => {
    loadData();
    loadHistory();
  }, []);

  const handleRegularizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regReason.trim()) {
      setRegMessage({ text: "Please enter a reason/comment for the regularization request.", ok: false });
      return;
    }

    setRegSubmitting(true);
    setRegMessage(null);

    const payload = {
      date: regDate,
      type: regType,
      clockIn: ["BOTH", "CLOCK_IN"].includes(regType) ? regClockIn : undefined,
      clockOut: ["BOTH", "CLOCK_OUT"].includes(regType) ? regClockOut : undefined,
      reason: regReason,
    };

    try {
      const res = await fetch("/api/attendance/regularize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setRegMessage({
        text: res.ok ? "Regularization request submitted successfully to SuperAdmin!" : data.error || "Failed to submit request.",
        ok: res.ok,
      });
      if (res.ok) {
        setRegReason("");
        loadHistory();
        setTimeout(() => {
          setIsRegularizeOpen(false);
          setRegMessage(null);
        }, 1500);
      }
    } catch {
      setRegMessage({ text: "Network error occurred.", ok: false });
    } finally {
      setRegSubmitting(false);
    }
  };

  const formatHours = (hoursVal: number | null | undefined) => {
    if (!hoursVal) return { h: "00", m: "00m" };
    const totalMinutes = Math.round(hoursVal * 60);
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const m = `${totalMinutes % 60}m`;
    return { h, m };
  };

  // Compile punches into visual work cycles (IN to OUT pairings)
  const computeCycles = (): Cycle[] => {
    const cyclesList: Cycle[] = [];
    const punches = payload?.punches || [];

    for (let i = 0; i < punches.length; i++) {
      const punch = punches[i];
      if (punch.punchType === "IN") {
        const nextPunch = punches[i + 1];
        let durationStr = "Active Session";
        let outTime = null;

        if (nextPunch && nextPunch.punchType === "OUT") {
          outTime = nextPunch.punchedAt;
          const delta = new Date(nextPunch.punchedAt).getTime() - new Date(punch.punchedAt).getTime();
          const mins = Math.round(delta / 60000);
          durationStr = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
          i++; // Skip next OUT punch
        } else {
          // Still clocked in (running duration since clock-in)
          const delta = new Date().getTime() - new Date(punch.punchedAt).getTime();
          const mins = Math.round(delta / 60000);
          durationStr = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m (Active)`;
        }

        cyclesList.push({
          id: punch.id,
          inTime: punch.punchedAt,
          outTime,
          duration: durationStr,
          location: punch.location,
          device: punch.device,
        });
      }
    }
    return cyclesList;
  };

  // Formatted date string
  const todayStr = format(new Date(), "dd MMM yyyy").toUpperCase();

  // Calculate stats
  const totalHoursToday = payload?.totalHours || 0;
  const punchCyclesList = computeCycles();
  const punchCycles = punchCyclesList.length;

  const hoursTodayFormatted = formatHours(totalHoursToday);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            TODAY · {todayStr}
          </p>
          <h2 className="text-3xl font-extrabold text-zinc-950 mt-1">
            Mark your <span className="italic-serif text-4xl font-light">hours</span>,
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Punch in when you start, punch out when you log off. Unlimited cycles supported through the day.
          </p>
        </div>

        {/* Present status badge & Regularize buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {payload?.record ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Present
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              Not checked in
            </span>
          )}

          <button
            onClick={() => setIsRegularizeOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <Calendar className="h-3.5 w-3.5 text-zinc-500" />
            Apply Regularization
          </button>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Today's Session (Full GPS validation widget) */}
        <div className="min-h-[210px] flex">
          <AttendanceCard 
            initialPunches={payload?.punches || []} 
            onPunchSuccess={loadData} 
          />
        </div>

        {/* Card 2: Total Hours Today */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[210px]">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              TOTAL HOURS TODAY
            </p>
            <p className="text-4xl font-extrabold text-zinc-950 mt-4 leading-none">
              {hoursTodayFormatted.h}
              <span className="text-sm font-medium text-zinc-400 ml-1 font-sans">h {hoursTodayFormatted.m}</span>
            </p>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Target: 8h
          </p>
        </div>

        {/* Card 3: Punch Cycles */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[210px]">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              PUNCH CYCLES
            </p>
            <p className="text-5xl font-extrabold text-zinc-950 mt-4 leading-none">
              {punchCycles}
            </p>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Avg 3.5h per cycle
          </p>
        </div>

        {/* Card 4: Month Summary */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[210px]">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              MONTH SUMMARY
            </p>
            <p className="text-4xl font-extrabold text-zinc-950 mt-4 leading-none">
              18
              <span className="text-sm font-medium text-zinc-400 ml-1 font-sans">/22</span>
            </p>
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            2 leaves · 2 WFH
          </p>
        </div>
      </div>

      {/* Cycle-Based Duration Presentation (Keka style) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              Today&apos;s Work <span className="italic-serif text-base font-light">cycles</span>
            </h3>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              Work duration blocks for active shifts. Exact clock times are summarized below.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm space-y-4">
            {punchCyclesList.length > 0 ? (
              <div className="space-y-4">
                {/* Horizontal segment track bar */}
                <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                  {punchCyclesList.map((cycle, idx) => (
                    <div
                      key={cycle.id}
                      className="bg-emerald-500 h-full flex-1 border-r border-white last:border-0 hover:opacity-90 transition-opacity"
                      title={`Cycle ${idx + 1}: ${cycle.duration}`}
                    />
                  ))}
                </div>

                {/* Work duration columns */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {punchCyclesList.map((cycle, index) => {
                    const checkInTime = format(new Date(cycle.inTime), "hh:mm a");
                    const checkOutTime = cycle.outTime ? format(new Date(cycle.outTime), "hh:mm a") : "Active Now";
                    return (
                      <div
                        key={cycle.id}
                        className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Cycle {index + 1}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {cycle.duration}
                          </span>
                        </div>
                        <div className="mt-3 text-xs font-bold text-zinc-800">
                          {checkInTime} — {checkOutTime}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1">
                          {cycle.location || "Office · Bhubaneswar HQ"} · {cycle.device || "Web"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Big Total Hours Worked Banner at the Bottom */}
                <div className="border-t border-zinc-100 pt-4 mt-2 flex items-center justify-between bg-zinc-50 -mx-6 -mb-6 p-6 rounded-b-xl">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                      TOTAL DURATION WORKED
                    </p>
                    <p className="text-xl font-extrabold text-zinc-950 mt-1">
                      {hoursTodayFormatted.h}h {hoursTodayFormatted.m}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                      STATUS
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Present
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-400 space-y-2.5">
                <Clock className="h-8 w-8 mx-auto text-zinc-300 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-zinc-800">No work cycles completed today</p>
                  <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                    Click Punch In above to begin tracking your work shift.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Regularization History Side panel */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              Regularization <span className="italic-serif text-base font-light">requests</span>
            </h3>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              Your recent regularization applications.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm space-y-3 max-h-[350px] overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">No request history found.</p>
            ) : (
              history.map((req) => (
                <div key={req.id} className="rounded-lg border border-zinc-100 p-3 space-y-1 bg-zinc-50/50">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-zinc-500 uppercase tracking-wide">
                      {format(new Date(req.date), "dd MMM yyyy")}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[8px] uppercase tracking-wide ${
                        req.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : req.status === "REJECTED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-800 capitalize mt-1">
                    {req.type.replaceAll("_", " ")}
                  </p>
                  {req.reason && (
                    <p className="text-[10px] text-zinc-500 italic mt-0.5 line-clamp-2">
                      &quot;{req.reason}&quot;
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Regularization Apply Modal */}
      {isRegularizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-950 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-400" />
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">Attendance Regularization</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Correct missing punch details or request remote approval.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRegularizeOpen(false);
                  setRegMessage(null);
                }}
                className="rounded-full p-1 hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRegularizeSubmit} className="p-6 space-y-4">
              {regMessage && (
                <div
                  className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
                    regMessage.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {regMessage.text}
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Target Date *
                </label>
                <input
                  type="date"
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                />
              </div>

              {/* Regularization Type */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Correction Type *
                </label>
                <select
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900"
                  value={regType}
                  onChange={(e) => setRegType(e.target.value as "CLOCK_IN" | "CLOCK_OUT" | "BOTH" | "REMOTE" | "LEAVE")}
                >
                  <option value="BOTH">Both Punch In & Out (Missing Shift)</option>
                  <option value="CLOCK_IN">Manual Clock In (Forgot In)</option>
                  <option value="CLOCK_OUT">Manual Clock Out (Forgot Out)</option>
                  <option value="REMOTE">Working Remotely (Full WFH Day)</option>
                  <option value="LEAVE">On Leave</option>
                </select>
              </div>

              {/* Times */}
              {["BOTH", "CLOCK_IN"].includes(regType) && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Manual Clock In Time *
                  </label>
                  <input
                    type="time"
                    required
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900"
                    value={regClockIn}
                    onChange={(e) => setRegClockIn(e.target.value)}
                  />
                </div>
              )}

              {["BOTH", "CLOCK_OUT"].includes(regType) && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Manual Clock Out Time *
                  </label>
                  <input
                    type="time"
                    required
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900"
                    value={regClockOut}
                    onChange={(e) => setRegClockOut(e.target.value)}
                  />
                </div>
              )}

              {/* Compulsory Reason */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Reason for Request *
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-900 resize-none"
                  placeholder="Explain why you are requesting regularization (e.g., card punch failed, client visit, forgot to clock in)..."
                  value={regReason}
                  onChange={(e) => setRegReason(e.target.value)}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegularizeOpen(false);
                    setRegMessage(null);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {regSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
