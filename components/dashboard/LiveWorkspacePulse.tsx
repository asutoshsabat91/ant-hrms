"use client";

import { useState } from "react";
import { CheckCircle2, Activity, Sparkles, RefreshCw, Database, Mail, FileSpreadsheet } from "lucide-react";

interface LiveWorkspacePulseProps {
  activeCount: number;
  presentPct: number;
  onLeaveCount: number;
  pendingApprovals: number;
}

const QUOTES = [
  "Sipping virtual coffee, shipping actual commits. ☕",
  "Google Sheets auto-sync is healthy and active. 📊",
  "Workspace directory API is listening for new joinees. 🔑",
  "Separation triggers are configured and secure. 🛡️",
  "Full & Final Settlement automations are ready. 💼",
  "Designing state-of-the-art experiences at AntBox. 🎨",
];

export function LiveWorkspacePulse({
  activeCount,
  presentPct,
  onLeaveCount,
  pendingApprovals,
}: LiveWorkspacePulseProps) {
  const [quote, setQuote] = useState(QUOTES[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("Just now");

  function rollQuote() {
    const nextIndex = (QUOTES.indexOf(quote) + 1) % QUOTES.length;
    setQuote(QUOTES[nextIndex]);
  }

  async function triggerSync() {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/google/sheets-sync", { method: "POST" });
      if (res.ok) {
        setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-6 relative overflow-hidden font-sans">
      {/* Glow highlight */}
      <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-radial-gradient from-purple-100 to-transparent opacity-30 blur-3xl pointer-events-none" />

      {/* Left panel: Info & Metrics */}
      <div className="flex-1 space-y-5 z-10 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Live Workspace Pulse</span>
            <span className="rounded-full bg-zinc-50 border border-zinc-200 px-2 py-0.5 text-[9px] font-bold text-zinc-600">SYSTEM: ONLINE</span>
          </div>

          <h3 className="text-xl font-bold text-zinc-950 flex items-center gap-1.5">
            Colony Workspace <Sparkles className="h-4 w-4 text-[#8e43ac]" />
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed font-medium">
            Bi-directional sync pipeline and directory automations are running. Today&apos;s attendance velocity (currently {presentPct}%) influences colony activity.
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-t border-zinc-100 pt-3">
            <div>Active: <span className="text-zinc-900 font-extrabold font-mono">{activeCount}</span></div>
            <div>On Leave: <span className="text-zinc-900 font-extrabold font-mono">{onLeaveCount}</span></div>
            <div>Pending: <span className="text-zinc-900 font-extrabold font-mono">{pendingApprovals}</span></div>
            <div>Last Sync: <span className="text-zinc-900 font-extrabold font-mono">{lastSync}</span></div>
          </div>
        </div>

        {/* Dynamic quote display */}
        <div 
          onClick={rollQuote}
          className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100/50 transition-colors cursor-pointer select-none flex items-center gap-2 group"
        >
          <Activity className="h-4.5 w-4.5 text-[#8e43ac] shrink-0 group-hover:scale-105 transition-transform" />
          <span className="flex-1 italic">&quot;{quote}&quot;</span>
        </div>

        {/* Integration Status checkmarks */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Sheets Sync</p>
            <p className="text-[10px] font-bold text-zinc-800">Master Sheet Connected</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Mail className="h-4 w-4 text-[#8e43ac]" />
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Workspace API</p>
            <p className="text-[10px] font-bold text-zinc-800">Gmail Auto-Provision</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Database className="h-4 w-4 text-amber-600" />
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Database</p>
            <p className="text-[10px] font-bold text-zinc-800">PostgreSQL Status ok</p>
          </div>
        </div>
      </div>

      {/* Right panel: Static Status Cards */}
      <div className="w-full md:w-[300px] rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex flex-col justify-between relative min-h-[220px] z-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Workspace Status Board</p>
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className="p-1 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center justify-center"
              title="Sync Master Sheet Now"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Attendance Progress Card */}
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-white border border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Attendance Velocity</p>
                <p className="text-sm font-extrabold text-zinc-950 font-mono">{presentPct}%</p>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div className="h-full bg-[#8e43ac] rounded-full transition-all duration-500" style={{ width: `${presentPct}%` }} />
              </div>
            </div>
            
            {/* Active Hires status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Active Employees</p>
                <p className="text-base font-extrabold text-zinc-950 mt-0.5">{activeCount}</p>
              </div>
              <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full uppercase tracking-wider">Directory</span>
            </div>

            {/* Pending actions status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Pending Leaves</p>
                <p className="text-base font-extrabold text-zinc-950 mt-0.5">{pendingApprovals}</p>
              </div>
              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${pendingApprovals > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-zinc-100 text-zinc-500"}`}>
                {pendingApprovals > 0 ? "Needs Review" : "Clear"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
