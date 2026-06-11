"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  LogIn,
  LogOut,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PunchType = "IN" | "OUT";

type Punch = {
  id: string;
  punchType: PunchType;
  punchedAt: string;
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
  action?: "punch_in" | "punch_out";
  hoursThisSession?: number | null;
};

type ApiEnvelope = {
  success: boolean;
  data: AttendancePayload;
  message: string;
  errors?: string[];
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function formatHours(hours: number | null | undefined) {
  if (!hours) return "0h 00m";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function sessionDuration(punches: Punch[], index: number) {
  const punch = punches[index];
  if (punch.punchType !== "OUT") return null;

  for (let i = index - 1; i >= 0; i -= 1) {
    if (punches[i].punchType === "IN") {
      const delta = new Date(punch.punchedAt).getTime() - new Date(punches[i].punchedAt).getTime();
      return formatHours(delta / 3600000);
    }
  }

  return null;
}

function makeCalendarDays() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month, index + 1);
    const day = date.getDay();
    return {
      date,
      label: index + 1,
      isToday: index + 1 === today.getDate(),
      isWeekend: day === 0 || day === 6,
    };
  });
}

export function AttendancePunchControls() {
  const [payload, setPayload] = useState<AttendancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const days = useMemo(makeCalendarDays, []);

  async function loadRecord() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/attendance");
      const envelope = (await response.json()) as ApiEnvelope;
      if (!response.ok || !envelope.success) {
        setError(envelope.message || "Unable to load attendance status.");
        setPayload(null);
      } else {
        setPayload(envelope.data);
      }
    } catch {
      setError("Unable to load attendance status.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecord();
  }, []);

  const nextAction = payload?.nextAction ?? "PUNCH_IN";
  const isPunchOut = nextAction === "PUNCH_OUT";
  const actionLabel = isPunchOut ? "Punch out" : "Punch in";

  async function handleAction() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: "Web" }),
      });
      const envelope = (await response.json()) as ApiEnvelope;
      if (!response.ok || !envelope.success) {
        setError(envelope.message || "Unable to update attendance.");
      } else {
        setPayload(envelope.data);
        setMessage(envelope.message);
      }
    } catch {
      setError("Unable to update attendance.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-lg border border-[#8e43ac] bg-white ring-0">
      <CardHeader className="border-b border-[#8e43ac]/30 px-6 pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold text-[#1a1a1a]">Today&apos;s attendance</CardTitle>
            <CardDescription className="mt-2 text-sm text-[#4a4a4a]">
              {formatDate(new Date())}
            </CardDescription>
          </div>
          <div className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-[#1a1a1a] ring-1 ring-[#8e43ac]/40">
            <span className={cn("h-2 w-2 rounded-full", payload?.isIncomplete ? "bg-[#8e43ac]" : "bg-[#1a1a1a]")} />
            {payload?.record ? (payload.isIncomplete ? "Punched in" : "Present") : "Not started"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-12 animate-pulse rounded bg-[#8e43ac]/10" />
            <div className="h-28 animate-pulse rounded bg-[#8e43ac]/10" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            <Button
              className={cn(
                "h-14 w-full rounded bg-[#8e43ac] text-base font-semibold uppercase tracking-normal text-white hover:bg-[#7535a0]",
                isPunchOut && "bg-[#1a1a1a] hover:bg-[#4a4a4a]"
              )}
              onClick={handleAction}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : isPunchOut ? (
                <LogOut className="mr-2 h-5 w-5" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              {submitting ? "Recording..." : actionLabel}
            </Button>

            {message && (
              <div className="flex items-center gap-2 rounded border border-[#8e43ac] px-4 py-3 text-sm font-medium text-[#1a1a1a]">
                <CheckCircle2 className="h-4 w-4 text-[#8e43ac]" />
                {message}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-[#8e43ac]/40 p-4">
                <Clock3 className="mb-3 h-5 w-5 text-[#8e43ac]" />
                <p className="text-xs font-medium uppercase text-[#4a4a4a]">Total hours today</p>
                <p className="mt-2 text-2xl font-semibold text-[#1a1a1a]">
                  {formatHours(payload?.totalHours)}
                </p>
              </div>
              <div className="rounded-lg border border-[#8e43ac]/40 p-4">
                <TimerReset className="mb-3 h-5 w-5 text-[#8e43ac]" />
                <p className="text-xs font-medium uppercase text-[#4a4a4a]">Punch cycles</p>
                <p className="mt-2 text-2xl font-semibold text-[#1a1a1a]">
                  {Math.floor((payload?.punches.length ?? 0) / 2)}
                </p>
              </div>
              <div className="rounded-lg border border-[#8e43ac]/40 p-4">
                <CalendarDays className="mb-3 h-5 w-5 text-[#8e43ac]" />
                <p className="text-xs font-medium uppercase text-[#4a4a4a]">Month summary</p>
                <p className="mt-2 text-2xl font-semibold text-[#1a1a1a]">1 present</p>
              </div>
            </div>

            <section className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a1a]">Today&apos;s punches</h3>
                <p className="text-sm text-[#4a4a4a]">Unlimited punch-in and punch-out cycles for the day.</p>
              </div>
              {!payload?.punches.length ? (
                <div className="rounded-lg border border-[#8e43ac]/40 px-4 py-8 text-center">
                  <Clock3 className="mx-auto mb-3 h-8 w-8 text-[#8e43ac]" />
                  <p className="font-semibold text-[#1a1a1a]">No punches recorded</p>
                  <p className="mt-1 text-sm text-[#4a4a4a]">Use the punch button to start today&apos;s attendance.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-[#8e43ac]/40">
                  {payload.punches.map((punch, index) => {
                    const duration = sessionDuration(payload.punches, index);
                    return (
                      <div
                        key={punch.id}
                        className="grid grid-cols-[92px_1fr_auto] items-center gap-3 border-b border-[#8e43ac]/20 px-4 py-3 last:border-b-0"
                      >
                        <span className="font-medium text-[#1a1a1a]">{formatTime(punch.punchedAt)}</span>
                        <span className="text-sm text-[#4a4a4a]">
                          {punch.punchType === "IN" ? "Punch In" : "Punch Out"}
                        </span>
                        {duration && (
                          <span className="rounded border border-[#8e43ac]/40 px-2 py-1 text-xs font-medium text-[#8e43ac]">
                            {duration}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a1a]">Monthly summary</h3>
                <p className="text-sm text-[#4a4a4a]">June 2026 overview using the active attendance record.</p>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {days.map((day) => (
                  <div
                    key={day.label}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded border text-sm font-medium",
                      day.isToday
                        ? "border-[#8e43ac] bg-[#8e43ac] text-white"
                        : day.isWeekend
                          ? "border-[#4a4a4a]/20 text-[#4a4a4a]"
                          : "border-[#8e43ac]/30 text-[#1a1a1a]"
                    )}
                  >
                    {day.label}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
