"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Users, FileText, CalendarDays } from "lucide-react";

interface LiveWorkspacePulseProps {
  activeCount: number;
  presentPct: number;
  onLeaveCount: number;
  pendingApprovals: number;
}

export function LiveWorkspacePulse({
  activeCount,
  presentPct,
  onLeaveCount,
  pendingApprovals,
}: LiveWorkspacePulseProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  async function triggerSync() {
    setIsSyncing(true);
    try {
      await fetch("/api/google/sheets-sync", { method: "POST" });
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  }

  // Determine greeting based on current local time
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6 relative overflow-hidden font-sans">
      {/* Top Banner section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Workspace Status</span>
          </div>
          <h3 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-1.5">
            {getGreeting()}! Here is your daily digest <Sparkles className="h-4.5 w-4.5 text-amber-500" />
          </h3>
          <p className="text-xs text-zinc-400 font-medium">
            A quick summary of team activity and pending checklist items.
          </p>
        </div>

        {/* Sync Google Sheets trigger */}
        <button
          onClick={triggerSync}
          disabled={isSyncing}
          className="self-start sm:self-center flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm active:translate-y-0.5 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${isSyncing ? "animate-spin text-emerald-600" : ""}`} />
          <span>{isSyncing ? "Syncing Google Sheets..." : "Sync Google Sheets"}</span>
        </button>
      </div>

      {/* Grid containing simplified, easy-to-understand metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Metric 1: Attendance Today */}
        <div className="rounded-xl border border-zinc-150 bg-zinc-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Attendance Today</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{presentPct}%</p>
            <p className="text-[10px] text-zinc-500 font-semibold mt-1">
              of your {activeCount} active teammates are present today.
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${presentPct}%` }} />
          </div>
        </div>

        {/* Metric 2: Teammates on Leave */}
        <div className="rounded-xl border border-zinc-150 bg-zinc-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Teammates on Leave</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{onLeaveCount}</p>
            <p className="text-[10px] text-zinc-500 font-semibold mt-1">
              {onLeaveCount === 1 ? "teammate is" : "teammates are"} currently away on approved leave.
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${activeCount > 0 ? (onLeaveCount / activeCount) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Metric 3: Pending Approvals */}
        <div className="rounded-xl border border-zinc-150 bg-zinc-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Leaves Pending Action</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{pendingApprovals}</p>
            <p className="text-[10px] text-zinc-500 font-semibold mt-1">
              {pendingApprovals > 0 
                ? `${pendingApprovals} leave request${pendingApprovals === 1 ? "" : "s"} await your approval.` 
                : "All leave request items have been resolved."}
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${pendingApprovals > 0 ? "bg-amber-500" : "bg-zinc-300"}`} style={{ width: pendingApprovals > 0 ? "100%" : "0%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
