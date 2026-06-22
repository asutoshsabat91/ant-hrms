"use client";

import { useEffect, useState } from "react";
import { Monitor, BarChart3, Briefcase, Users } from "lucide-react";

export function TribeRadarWidget({
  activeCandidates = 14,
  avgReadiness = 87.4,
  sprintsLive = 6,
  pposClaimed = 8,
}: {
  activeCandidates?: number;
  avgReadiness?: number;
  sprintsLive?: number;
  pposClaimed?: number;
}) {
  const [candidatesCount, setCandidatesCount] = useState(activeCandidates);

  useEffect(() => {
    setCandidatesCount(activeCandidates);
  }, [activeCandidates]);

  useEffect(() => {
    // Dynamic ticker simulation to make it feel alive!
    const interval = setInterval(() => {
      setCandidatesCount((prev) => {
        const scale = activeCandidates > 100 ? 5 : 2;
        const delta = Math.floor(Math.random() * (scale * 2 + 1)) - scale;
        const next = prev + delta;
        return next < 0 ? 0 : next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [activeCandidates]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 shadow-2xl text-white flex flex-col h-full justify-between min-h-[380px]">
      {/* Background soft glowing orb */}
      <div className="absolute top-[-100px] right-[-100px] w-[250px] h-[250px] bg-radial-gradient from-[rgba(142,67,172,0.15)] to-transparent pointer-events-none rounded-full blur-2xl" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
            Talent Sourcing Engine
          </p>
          <h3 className="text-sm font-bold text-white mt-0.5">
            Tribe <span className="italic-serif text-base font-light text-[var(--purple)]">Radar</span>
          </h3>
        </div>
        
        {/* Pulsing Status Badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
            Live Radar
          </span>
        </div>
      </div>

      {/* Animated Orbital Radar */}
      <div className="relative my-6 flex items-center justify-center h-40">
        
        {/* Radar sweeping line overlay */}
        <div className="absolute w-32 h-32 rounded-full border border-zinc-900 pointer-events-none" />
        
        {/* Main spinning dashed ring */}
        <div className="absolute w-28 h-28 rounded-full border border-dashed border-[var(--purple)]/30 animate-slow-spin flex items-center justify-center">
          
          {/* Orb 1: Dev (Top) */}
          <div className="absolute top-[-12px] left-[calc(50%-12px)] w-6 h-6 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center shadow-lg group hover:border-[var(--purple)] transition-colors">
            <div className="animate-slow-spin-reverse text-zinc-400 group-hover:text-[var(--purple)]">
              <Monitor className="h-3 w-3" />
            </div>
          </div>

          {/* Orb 2: Analytics (Right) */}
          <div className="absolute right-[-12px] top-[calc(50%-12px)] w-6 h-6 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center shadow-lg group hover:border-[var(--purple)] transition-colors">
            <div className="animate-slow-spin-reverse text-zinc-400 group-hover:text-[var(--purple)]">
              <BarChart3 className="h-3 w-3" />
            </div>
          </div>

          {/* Orb 3: Business/Ops (Bottom) */}
          <div className="absolute bottom-[-12px] left-[calc(50%-12px)] w-6 h-6 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center shadow-lg group hover:border-[var(--purple)] transition-colors">
            <div className="animate-slow-spin-reverse text-zinc-400 group-hover:text-[var(--purple)]">
              <Briefcase className="h-3 w-3" />
            </div>
          </div>

          {/* Orb 4: People/HR (Left) */}
          <div className="absolute left-[-12px] top-[calc(50%-12px)] w-6 h-6 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center shadow-lg group hover:border-[var(--purple)] transition-colors">
            <div className="animate-slow-spin-reverse text-zinc-400 group-hover:text-[var(--purple)]">
              <Users className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* Center core */}
        <div className="relative w-16 h-16 bg-[var(--purple)] border border-[rgba(255,255,255,0.2)] rounded-full flex flex-col items-center justify-center shadow-[0_0_20px_rgba(142,67,172,0.4)] animate-pulse">
          <span className="text-[10px] font-bold tracking-tight text-white leading-none">Your</span>
          <span className="text-[11px] font-extrabold text-white mt-0.5 leading-none uppercase tracking-wider">Tribe</span>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="relative z-10 grid grid-cols-2 gap-2 mt-auto">
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-2.5 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-900/80">
          <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-semibold block leading-none">
            Active Candidates
          </span>
          <span className="text-base font-extrabold text-white mt-1 block tracking-tight">
            {candidatesCount}
          </span>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-2.5 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-900/80">
          <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-semibold block leading-none">
            Avg Readiness
          </span>
          <span className="text-base font-extrabold text-white mt-1 block tracking-tight">
            {avgReadiness.toFixed(1)}%
          </span>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-2.5 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-900/80">
          <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-semibold block leading-none">
            Sprints Live
          </span>
          <span className="text-base font-extrabold text-white mt-1 block tracking-tight">
            {sprintsLive} active
          </span>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-2.5 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-900/80">
          <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-semibold block block leading-none">
            PPOs Claimed
          </span>
          <span className="text-base font-extrabold text-[var(--purple)] mt-1 block tracking-tight">
            {pposClaimed}
          </span>
        </div>
      </div>
    </div>
  );
}
