"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { Zap, ShieldCheck, Sparkles, Activity, Layers, Command, Lock, Cpu } from "lucide-react";

export default function LoginPage() {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - left) / width;
      const y = (e.clientY - top) / height;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Calculate 3D tilt rotations based on cursor position
  const tiltX = (mousePos.y - 0.5) * -16; // -8 to 8 deg
  const tiltY = (mousePos.x - 0.5) * 16;  // -8 to 8 deg
  const auraX = mousePos.x * 100;
  const auraY = mousePos.y * 100;

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-full bg-[#060608] text-white font-sans selection:bg-[#d882ff]/30 selection:text-[#d882ff] relative overflow-hidden flex flex-col lg:flex-row items-stretch"
    >
      {/* Dynamic Cursor-Tracking Holographic Plasma Background */}
      <div 
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 z-0"
        style={{
          background: `
            radial-gradient(1000px circle at ${auraX}% ${auraY}%, rgba(142, 67, 172, 0.28), transparent 60%),
            radial-gradient(600px circle at ${100 - auraX}% ${100 - auraY}%, rgba(112, 51, 135, 0.18), transparent 50%)
          `,
        }}
      />

      {/* 3D Cyber Isometric Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_80%,transparent_100%)] pointer-events-none z-0" />

      {/* Floating 3D Geometric Orbs */}
      <div className="absolute top-12 left-1/4 w-32 h-32 rounded-full bg-gradient-to-tr from-[#8e43ac]/30 to-[#d882ff]/30 blur-2xl animate-float pointer-events-none z-0" />
      <div className="absolute bottom-16 right-1/3 w-44 h-44 rounded-full bg-gradient-to-br from-[#703387]/30 to-purple-900/20 blur-3xl animate-float pointer-events-none z-0" style={{ animationDelay: "2s" }} />

      {/* ── Left Column: 3D Spatial Sign-In Card ──────────────── */}
      <div className="w-full lg:w-5/12 flex flex-col justify-between p-6 sm:p-10 md:p-14 relative z-10 min-h-screen">
        
        {/* Brand Logo Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-zinc-900/80 border border-white/15 backdrop-blur-xl shadow-[0_0_20px_rgba(142,67,172,0.2)]">
              <Image src="/logo.png" alt="AntBox Logo" width={110} height={32} className="object-contain filter invert brightness-200 contrast-125" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#d882ff] animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#d882ff] bg-[#8e43ac]/20 border border-[#8e43ac]/40 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(142,67,172,0.35)] backdrop-blur-md">
              v3.0 3D SPATIAL
            </span>
          </div>
        </div>

        {/* 3D Glass Sign-in Card */}
        <div className="w-full max-w-[440px] mx-auto py-8 [perspective:1200px]">
          <div 
            className="w-full rounded-3xl bg-zinc-950/80 border border-white/20 p-8 sm:p-10 backdrop-blur-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(142,67,172,0.2)] transition-transform duration-200 ease-out relative group"
            style={{
              transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Top Edge Specular Highlight Line */}
            <div className="absolute -top-[1px] left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#d882ff] to-transparent opacity-90" />

            <div className="space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#8e43ac]/20 border border-[#8e43ac]/40 text-[9px] font-extrabold uppercase tracking-widest text-[#d882ff]">
                  <Sparkles className="h-3 w-3" /> Secure Access Portal
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white pt-1">
                  Sign in <span className="text-sm font-light italic-serif text-[#d882ff]">to Workspace</span>
                </h2>
                <p className="text-xs text-zinc-400 font-medium">Enter credentials to access AntBox People Platform</p>
              </div>

              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-[#d882ff]" />
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Warming up AntBox...</p>
                </div>
              }>
                <div className="login-3d-form-wrapper">
                  <LoginForm />
                </div>
              </Suspense>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-t border-white/10 pt-5">
          <span className="flex items-center gap-2 text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
            COLONY NETWORK HQ
          </span>
          <span className="text-zinc-700">•</span>
          <span className="text-zinc-400">PEOPLE@THEANTBOX.COM</span>
        </div>
      </div>

      {/* ── Right Column: Funky 3D Spatial Holographic Stage ───── */}
      <div className="hidden lg:flex lg:w-7/12 flex-col justify-center items-center p-10 xl:p-16 relative z-10 border-l border-white/10 bg-zinc-950/60 backdrop-blur-md overflow-hidden select-none">
        
        {/* Background Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#8e43ac]/20 to-[#d882ff]/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-2xl space-y-10 text-center relative z-10 [perspective:1400px]">
          
          {/* Header Typography */}
          <div className="space-y-4 relative">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/15 backdrop-blur-xl shadow-[0_0_25px_rgba(142,67,172,0.3)]">
              <Command className="h-3.5 w-3.5 text-[#d882ff] animate-pulse" />
              <p className="text-[11px] font-black uppercase tracking-widest text-[#d882ff]">NEXT-GEN WORKFORCE PLATFORM</p>
            </div>
            
            <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white leading-none max-w-lg mx-auto">
              Bridging Hires to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#d882ff] to-[#8e43ac] drop-shadow-[0_0_35px_rgba(142,67,172,0.5)]">
                SaaS Careers
              </span>
            </h1>

            <p className="text-xs xl:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed font-medium pt-1">
              Manage employee onboarding, geofenced attendance, leave policies, and automated payroll runs in a high-speed spatial workspace.
            </p>
          </div>

          {/* 3D Funky Holographic Telemetry Tiles Grid */}
          <div className="grid grid-cols-2 gap-5 px-4 text-left">
            
            {/* Tile 1: Instant Clock-In */}
            <div 
              className="bg-zinc-900/70 border border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-all duration-500 hover:-translate-y-2 hover:rotate-1 hover:border-[#8e43ac] hover:shadow-[0_25px_50px_rgba(142,67,172,0.3)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * 0.6}deg) rotateY(${tiltY * 0.6}deg)` }}
            >
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#8e43ac]/20 rounded-full blur-2xl group-hover:bg-[#8e43ac]/40 transition-all duration-500" />
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#8e43ac] to-[#d882ff] p-0.5 shadow-[0_0_20px_rgba(142,67,172,0.5)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-[#d882ff] group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Instant Attendance</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">Geofenced GPS telemetry & fast remote clock-ins.</p>
            </div>

            {/* Tile 2: Zero-Trust Security */}
            <div 
              className="bg-zinc-900/70 border border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-all duration-500 hover:-translate-y-2 hover:-rotate-1 hover:border-[#8e43ac] hover:shadow-[0_25px_50px_rgba(142,67,172,0.3)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * -0.6}deg) rotateY(${tiltY * -0.6}deg)` }}
            >
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/40 transition-all duration-500" />
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 p-0.5 shadow-[0_0_20px_rgba(16,185,129,0.4)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Zero-Trust Isolation</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">Strict role-based payroll & employee data protection.</p>
            </div>

            {/* Tile 3: Live Telemetry */}
            <div 
              className="bg-zinc-900/70 border border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-all duration-500 hover:-translate-y-2 hover:-rotate-1 hover:border-[#8e43ac] hover:shadow-[0_25px_50px_rgba(142,67,172,0.3)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * 0.6}deg) rotateY(${tiltY * -0.6}deg)` }}
            >
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/20 rounded-full blur-2xl group-hover:bg-cyan-500/40 transition-all duration-500" />
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-400 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Live Workspace Pulse</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">Real-time attendance logs & headcount analytics.</p>
            </div>

            {/* Tile 4: Automated Payroll */}
            <div 
              className="bg-zinc-900/70 border border-white/15 p-6 rounded-3xl backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] transition-all duration-500 hover:-translate-y-2 hover:rotate-1 hover:border-[#8e43ac] hover:shadow-[0_25px_50px_rgba(142,67,172,0.3)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * -0.6}deg) rotateY(${tiltY * 0.6}deg)` }}
            >
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/40 transition-all duration-500" />
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Automated Payroll</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">1-click salary calculations & slip generation.</p>
            </div>

          </div>

          {/* Location / Tech Tag */}
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-3 pt-2">
            <span>BHUBANESWAR HQ</span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span>SAAS HRMS SUITE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
