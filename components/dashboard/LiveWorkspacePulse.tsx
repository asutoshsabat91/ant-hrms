"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Activity, Sparkles, RefreshCw, Play, Pause, Database, Mail, FileSpreadsheet } from "lucide-react";

interface LiveWorkspacePulseProps {
  activeCount: number;
  presentPct: number;
  onLeaveCount: number;
  pendingApprovals: number;
}

const QUOTES = [
  "Ants are marching, code is building! 🚀",
  "Sipping virtual coffee, shipping actual commits. ☕",
  "Google Sheets auto-sync is healthy and active. 📊",
  "Workspace directory API is listening for new joinees. 🔑",
  "Separation triggers are configured and secure. 🛡️",
  "Full & Final Settlement automations are ready. 💼",
  "Keep marching forward! One commit at a time. ✨",
  "Designing state-of-the-art experiences at AntBox. 🎨",
];

const THEMES = {
  violet: {
    name: "Royal Violet",
    primary: "bg-[#7c3aed]",
    gradient: "from-[#7c3aed] to-[#4f46e5]",
    text: "text-[#7c3aed]",
    antColor: "#7c3aed",
    itemColor: "#10b981",
  },
  emerald: {
    name: "Neon Emerald",
    primary: "bg-[#10b981]",
    gradient: "from-[#10b981] to-[#059669]",
    text: "text-[#10b981]",
    antColor: "#10b981",
    itemColor: "#f97316",
  },
  orange: {
    name: "Cyber Orange",
    primary: "bg-[#f97316]",
    gradient: "from-[#f97316] to-[#ea580c]",
    text: "text-[#f97316]",
    antColor: "#f97316",
    itemColor: "#3b82f6",
  },
};

export function LiveWorkspacePulse({
  activeCount,
  presentPct,
  onLeaveCount,
  pendingApprovals,
}: LiveWorkspacePulseProps) {
  const [speed, setSpeed] = useState<"slow" | "normal" | "hyper">("normal");
  const [theme, setTheme] = useState<keyof typeof THEMES>("violet");
  const [quote, setQuote] = useState(QUOTES[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("Just now");
  const [animationPlaying, setAnimationPlaying] = useState(true);

  // Speed values in seconds for the CSS animation durations
  const speedDurations = {
    slow: { track1: "25s", track2: "30s", track3: "28s" },
    normal: { track1: "15s", track2: "18s", track3: "16s" },
    hyper: { track1: "6s", track2: "8s", track3: "7s" },
  };

  useEffect(() => {
    // Automatically set speed based on attendance percentage as a cool detail
    if (presentPct > 80) {
      setSpeed("hyper");
    } else if (presentPct < 30) {
      setSpeed("slow");
    } else {
      setSpeed("normal");
    }
  }, [presentPct]);

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

  const selectedTheme = THEMES[theme];
  const duration = speedDurations[speed];

  return (
    <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-6 relative overflow-hidden">
      {/* Glow highlight */}
      <div className={`absolute -right-24 -top-24 h-48 w-48 rounded-full bg-radial-gradient from-purple-100 to-transparent opacity-50 blur-3xl pointer-events-none`} />

      {styleTag(duration, animationPlaying, selectedTheme.antColor, selectedTheme.itemColor)}

      {/* Left panel: Info & Metrics */}
      <div className="flex-1 space-y-5 z-10 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Live Workspace Pulse</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold text-zinc-600">SYSTEM: ONLINE</span>
          </div>

          <h3 className="text-xl font-extrabold text-zinc-950 flex items-center gap-1.5">
            Colony Workspace <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Bi-directional sync pipeline and directory automations are running. Today&apos;s attendance velocity (currently {presentPct}%) influences colony activity.
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-t border-dashed border-zinc-100 pt-2.5">
            <div>Active: <span className="text-zinc-900 font-extrabold font-mono">{activeCount}</span></div>
            <div>On Leave: <span className="text-zinc-900 font-extrabold font-mono">{onLeaveCount}</span></div>
            <div>Pending: <span className="text-zinc-900 font-extrabold font-mono">{pendingApprovals}</span></div>
            <div>Last Sync: <span className="text-zinc-900 font-extrabold font-mono">{lastSync}</span></div>
          </div>
        </div>

        {/* Dynamic quote display */}
        <div 
          onClick={rollQuote}
          className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100/50 transition-colors cursor-pointer select-none flex items-center gap-2 group"
        >
          <Activity className={`h-4.5 w-4.5 ${selectedTheme.text} shrink-0 group-hover:scale-110 transition-transform`} />
          <span className="flex-1 italic">&quot;{quote}&quot;</span>
        </div>

        {/* Integration Status checkmarks */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          <div className="rounded-xl border border-zinc-100 bg-white p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Sheets Sync</p>
            <p className="text-[10px] font-semibold text-zinc-800">Master Sheet Connected</p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-white p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Mail className="h-4 w-4 text-violet-500" />
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Workspace API</p>
            <p className="text-[10px] font-semibold text-zinc-800">Gmail Auto-Provision</p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-white p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Database className="h-4 w-4 text-orange-500" />
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Database</p>
            <p className="text-[10px] font-semibold text-zinc-800">PostgreSQL Status ok</p>
          </div>
        </div>
      </div>

      {/* Right panel: Animated Colony Track Box */}
      <div className="w-full md:w-[320px] rounded-xl border border-zinc-200 bg-zinc-950 p-4 flex flex-col justify-between relative shadow-inner overflow-hidden min-h-[220px]">
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:20px_20px]" />

        {/* Tracks area */}
        <div className="relative flex-1 flex flex-col justify-around py-4 z-10 select-none">
          {/* Track 1: Leaves */}
          <div className="relative h-12 w-full border-b border-white/5 flex items-center">
            <div className="absolute left-0 right-0 h-[2px] bg-white/[0.03] border-dashed border-t border-white/10" />
            <div className="ant-dashboard-track track-1 w-full flex items-center justify-start absolute">
              <AntSvg type="leaf" size={44} />
            </div>
            <span className="absolute right-2 bottom-1.5 text-[8px] font-mono text-zinc-600 uppercase tracking-wider">Leave track</span>
          </div>

          {/* Track 2: Coins */}
          <div className="relative h-12 w-full border-b border-white/5 flex items-center">
            <div className="absolute left-0 right-0 h-[2px] bg-white/[0.03] border-dashed border-t border-white/10" />
            <div className="ant-dashboard-track track-2 w-full flex items-center justify-start absolute">
              <AntSvg type="coin" size={44} />
            </div>
            <span className="absolute right-2 bottom-1.5 text-[8px] font-mono text-zinc-600 uppercase tracking-wider">Finance track</span>
          </div>

          {/* Track 3: Coffee */}
          <div className="relative h-12 w-full flex items-center">
            <div className="absolute left-0 right-0 h-[2px] bg-white/[0.03] border-dashed border-t border-white/10" />
            <div className="ant-dashboard-track track-3 w-full flex items-center justify-start absolute">
              <AntSvg type="coffee" size={44} />
            </div>
            <span className="absolute right-2 bottom-1.5 text-[8px] font-mono text-zinc-600 uppercase tracking-wider">Break track</span>
          </div>
        </div>

        {/* Controls bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between z-10">
          {/* Theme select */}
          <div className="flex gap-1.5">
            {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`h-4.5 w-4.5 rounded-full border border-white/20 transition-all ${THEMES[t].primary} ${theme === t ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
                title={THEMES[t].name}
              />
            ))}
          </div>

          {/* Controls toggle and Sync */}
          <div className="flex items-center gap-2">
            {/* Sync trigger button */}
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className={`p-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center`}
              title="Sync Master Sheet Now"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-emerald-400" : ""}`} />
            </button>

            {/* Play/Pause animation */}
            <button
              onClick={() => setAnimationPlaying(!animationPlaying)}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
              title={animationPlaying ? "Pause Colony" : "Start Colony"}
            >
              {animationPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
            </button>

            <span className="text-[9px] font-mono text-zinc-500 uppercase">
              {speed === "hyper" ? "⚡ hyper" : speed === "slow" ? "🐢 slow" : "🐜 active"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AntSvg({ type, size = 44 }: { type: "leaf" | "coin" | "coffee"; size?: number }) {
  return (
    <svg viewBox="0 0 100 60" style={{ width: `${size}px` }} className="overflow-visible select-none">
      {/* Carrying Item */}
      {type === "leaf" && (
        <path d="M 45,5 C 55,-5 70,5 65,15 C 60,20 40,15 45,5 Z" fill="var(--item-color)" className="ant-dashboard-carrying" />
      )}
      {type === "coin" && (
        <g className="ant-dashboard-carrying">
          <circle cx="50" cy="8" r="7" fill="var(--item-color)" />
          <text x="50" y="11.5" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">$</text>
        </g>
      )}
      {type === "coffee" && (
        <g className="ant-dashboard-carrying">
          <path d="M 42,4 L 58,4 L 56,14 L 44,14 Z" fill="var(--item-color)" />
          <path d="M 56,6 C 60,6 61,10 56,11" stroke="var(--item-color)" strokeWidth="1.5" fill="none" />
        </g>
      )}

      {/* Legs */}
      <path d="M 35,25 Q 25,40 20,42 M 45,25 Q 35,42 33,43 M 55,25 Q 45,43 42,43" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" className="ant-dashboard-leg-l" />
      <path d="M 35,25 Q 45,40 50,42 M 45,25 Q 55,42 57,43 M 55,25 Q 65,43 68,43" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" className="ant-dashboard-leg-r" />
      
      {/* Head & Antennae */}
      <path d="M 68,23 C 65,18 60,18 58,23 C 58,25 68,25 68,23 Z" fill="var(--ant-color)" />
      <path d="M 64,20 Q 68,10 74,8 M 62,20 Q 64,8 68,6" stroke="var(--ant-color)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      
      {/* Eyes */}
      <circle cx="64" cy="21" r="1.5" fill="#000" />
      
      {/* Body Segments */}
      <circle cx="50" cy="25" r="7" fill="var(--ant-color)" />
      <ellipse cx="32" cy="27" rx="10" ry="7" fill="#ffffff" />
    </svg>
  );
}

function styleTag(
  duration: { track1: string; track2: string; track3: string },
  animationPlaying: boolean,
  antColor: string,
  itemColor: string
) {
  const playState = animationPlaying ? "running" : "paused";
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --ant-color: ${antColor};
        --item-color: ${itemColor};
      }
      @keyframes dashboard-march {
        0% { transform: translateX(-60px); }
        100% { transform: translateX(340px); }
      }
      @keyframes dashboard-float-carrying {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-4px) rotate(4deg); }
      }
      @keyframes dashboard-leg-wiggle-left {
        0% { transform: rotate(-6deg); }
        100% { transform: rotate(6deg); }
      }
      @keyframes dashboard-leg-wiggle-right {
        0% { transform: rotate(6deg); }
        100% { transform: rotate(-6deg); }
      }
      .track-1 {
        animation: dashboard-march ${duration.track1} infinite linear ${playState};
      }
      .track-2 {
        animation: dashboard-march ${duration.track2} infinite linear ${playState};
      }
      .track-3 {
        animation: dashboard-march ${duration.track3} infinite linear ${playState};
      }
      .ant-dashboard-carrying {
        transform-origin: center bottom;
        animation: dashboard-float-carrying 1.2s infinite ease-in-out ${playState};
      }
      .ant-dashboard-leg-l {
        transform-origin: 20px 25px;
        animation: dashboard-leg-wiggle-left 0.12s infinite alternate ease-in-out ${playState};
      }
      .ant-dashboard-leg-r {
        transform-origin: 20px 25px;
        animation: dashboard-leg-wiggle-right 0.12s infinite alternate ease-in-out ${playState};
      }
    `}} />
  );
}
