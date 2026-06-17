"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";

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

export function AttendancePageClient() {
  const [payload, setPayload] = useState<AttendancePayload | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    loadData();
  }, []);

  async function handlePunchAction() {
    setSubmitting(true);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: "Web" }),
      });
      const envelope = (await response.json()) as ApiEnvelope;
      if (response.ok && envelope.success) {
        setPayload(envelope.data);
      }
    } catch {
      // Ignored
    } finally {
      setSubmitting(false);
    }
  }

  const formatHours = (hoursVal: number | null | undefined) => {
    if (!hoursVal) return { h: "00", m: "00m" };
    const totalMinutes = Math.round(hoursVal * 60);
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const m = `${totalMinutes % 60}m`;
    return { h, m };
  };

  const getSessionDuration = (punches: Punch[], index: number) => {
    const punch = punches[index];
    if (punch.punchType !== "OUT") return null;

    for (let i = index - 1; i >= 0; i -= 1) {
      if (punches[i].punchType === "IN") {
        const delta = new Date(punch.punchedAt).getTime() - new Date(punches[i].punchedAt).getTime();
        const hrs = delta / 3600000;
        const totalMinutes = Math.round(hrs * 60);
        return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
      }
    }
    return null;
  };

  const nextAction = payload?.nextAction ?? "PUNCH_IN";
  const isPunchOut = nextAction === "PUNCH_OUT";
  const actionLabel = isPunchOut ? "Punch Out" : "Punch In";

  // Formatted date string
  const todayStr = format(new Date(), "dd MMM yyyy").toUpperCase();

  // Calculate dynamic stats
  const totalHoursToday = payload?.totalHours || 0;
  const punchCycles = payload?.punches ? Math.floor(payload.punches.length / 2) : 0;
  
  // Format hours today
  const hoursTodayFormatted = formatHours(totalHoursToday);
  
  // Format session duration for display on card 1
  const sessionHoursVal = payload?.hoursThisSession || 0;
  const sessionHoursFormatted = formatHours(sessionHoursVal);

  const lastActivityTime = payload?.punches && payload.punches.length > 0 
    ? format(new Date(payload.punches[payload.punches.length - 1].punchedAt), "hh:mm a")
    : "No activity yet";

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

        {/* Present status badge */}
        <div className="self-start">
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
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Today's Session */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-850 p-6 text-white flex flex-col justify-between h-[210px] shadow-sm">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              TODAY&apos;S SESSION
            </p>
            <p className="text-3xl font-bold mt-2 font-mono tracking-tight">
              {sessionHoursFormatted.h} : {sessionHoursFormatted.m.replace("m", "")} <span className="text-xs font-normal text-zinc-400 font-sans">hrs</span>
            </p>
            <p className="text-[10px] text-zinc-400 font-medium mt-1">
              Across {punchCycles} cycle{punchCycles === 1 ? "" : "s"}
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={handlePunchAction}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 text-xs font-bold text-zinc-950 transition-colors hover:bg-zinc-100 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isPunchOut ? (
                <LogOut className="h-3.5 w-3.5" />
              ) : (
                <LogIn className="h-3.5 w-3.5" />
              )}
              <span>{submitting ? "Recording..." : actionLabel}</span>
            </button>
            <p className="text-center text-[9px] text-zinc-400 font-semibold leading-none">
              Last activity · {lastActivityTime}
            </p>
          </div>
        </div>

        {/* Card 2: Total Hours Today */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col justify-between h-[210px]">
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
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col justify-between h-[210px]">
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
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col justify-between h-[210px]">
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

      {/* Today's Punches Timeline */}
      <div className="space-y-4 pt-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-900">
            Today&apos;s <span className="italic-serif text-base font-light">punches</span>
          </h3>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Unlimited punch-in and punch-out cycles for the day.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
          {payload?.punches && payload.punches.length > 0 ? (
            <div className="space-y-5">
              {payload.punches.map((punch, index) => {
                const duration = getSessionDuration(payload.punches, index);
                const timeLabel = format(new Date(punch.punchedAt), "hh:mm a");
                return (
                  <div key={punch.id} className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-100 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      {/* Clock icon container */}
                      <div className="rounded-full bg-zinc-50 p-2 border border-zinc-100 text-zinc-400">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">
                          {punch.punchType === "IN" ? "Punch In" : "Punch Out"}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                          {punch.location || "Office · Bhubaneswar HQ"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-900">{timeLabel}</span>
                      {duration && (
                        <span className="rounded-lg bg-zinc-50 border border-zinc-150 px-2.5 py-1 text-[9px] font-bold text-zinc-500">
                          {duration}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-zinc-400 space-y-2.5">
              <Clock className="h-8 w-8 mx-auto text-zinc-300" />
              <div>
                <p className="text-xs font-bold text-zinc-800">No punches recorded today</p>
                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Use the Punch In button to start recording attendance.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
