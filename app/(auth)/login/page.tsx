"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";

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
  const tiltX = (mousePos.y - 0.5) * -12; // -6 to 6 deg
  const tiltY = (mousePos.x - 0.5) * 12;  // -6 to 6 deg
  const auraX = mousePos.x * 100;
  const auraY = mousePos.y * 100;

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-full bg-[#08080a] text-white font-sans selection:bg-[#8e43ac]/30 selection:text-[#d882ff] relative overflow-hidden flex flex-col lg:flex-row items-stretch"
    >
      {/* Dynamic Cursor-Tracking Ambient Neon Mesh Aura */}
      <div 
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000 z-0"
        style={{
          background: `radial-gradient(800px circle at ${auraX}% ${auraY}%, rgba(142, 67, 172, 0.22), rgba(112, 51, 135, 0.08) 40%, transparent 80%)`,
        }}
      />

      {/* Cyber Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* ── Left Column: 3D Spatial Sign-In Card ──────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 md:p-14 relative z-10 min-h-screen">
        
        {/* Header Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg shadow-[#8e43ac]/10">
              <Image src="/logo.png" alt="AntBox Logo" width={105} height={30} className="object-contain filter invert brightness-200 contrast-125" />
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#d882ff] bg-[#8e43ac]/15 border border-[#8e43ac]/30 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(142,67,172,0.3)]">
            v3.0 3D Spatial
          </span>
        </div>

        {/* 3D Glass Sign-in Card */}
        <div className="w-full max-w-[450px] mx-auto py-6 [perspective:1200px]">
          <div 
            className="w-full rounded-3xl bg-zinc-950/70 border border-white/15 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_30px_rgba(142,67,172,0.15)] transition-transform duration-200 ease-out relative group"
            style={{
              transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Top edge glow light */}
            <div className="absolute -top-[1px] left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-[#d882ff] to-transparent opacity-80" />

            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Sign in <span className="text-sm font-light italic-serif text-[#d882ff]">to AntBox</span>
                </h2>
                <p className="text-xs text-zinc-400 font-medium">Welcome back to AntBox People Platform</p>
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
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-t border-white/5 pt-5">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
            COLONY NETWORK
          </span>
          <span className="text-zinc-600">•</span>
          <span>PEOPLE@THEANTBOX.COM</span>
        </div>
      </div>

      {/* ── Right Column: Interactive 3D Ant Colony Spatial Stage ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-8 xl:p-12 relative z-10 border-l border-white/5 bg-zinc-950/40 backdrop-blur-sm overflow-hidden select-none">
        
        {/* Background Ambient Glow Orbs */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#8e43ac]/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#703387]/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Peeking Ants Mascot */}
        <div className="absolute bottom-0 right-0 w-48 h-80 pointer-events-none z-20 transition-transform duration-700 hover:scale-105">
          <Image 
            src="/ants/peeking-ants.png" 
            alt="Peeking Ants Mascot" 
            width={192}
            height={320}
            className="object-contain object-bottom object-right filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
            priority
          />
        </div>

        <div className="w-full max-w-xl space-y-8 text-center relative z-10">
          
          <div className="space-y-3 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_15px_rgba(142,67,172,0.2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d882ff] animate-ping" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#d882ff]">WORKSPACE DIRECTORY</p>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-white max-w-md mx-auto leading-tight">
              Bridging Hires to <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#d882ff] to-[#8e43ac]">SaaS Careers</span>
            </h1>

            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed font-medium">
              Manage employee onboarding, geofenced attendance, leave policies, and professional payroll runs in a premium spatial workspace.
            </p>

            {/* Funky Running Ants */}
            <div className="flex justify-center pt-2 filter drop-shadow-[0_0_10px_rgba(216,130,255,0.3)]">
              <Image 
                src="/ants/running-race-ants.png" 
                alt="Running Race Ants" 
                width={120} 
                height={38} 
                className="object-contain"
                priority
              />
            </div>
          </div>
          
          {/* 3D Levitating Mascot Cards Grid */}
          <div className="grid grid-cols-2 gap-4 items-stretch px-2 [perspective:1000px]">
            
            {/* 3D Card 1: Deep Work */}
            <div 
              className="bg-zinc-900/60 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-between backdrop-blur-xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-2 hover:border-[#8e43ac]/50 hover:shadow-[0_20px_40px_rgba(142,67,172,0.25)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * 0.5}deg) rotateY(${tiltY * 0.5}deg)` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#8e43ac]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex-1 flex items-center justify-center min-h-[85px] relative w-full">
                <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#8e43ac]/15 blur-md group-hover:bg-[#8e43ac]/30 transition-all duration-500" />
                <Image 
                  src="/ants/office-chair-sleep-ant.png" 
                  alt="Deep Work Sleep Ant" 
                  width={72} 
                  height={62} 
                  className="object-contain transition-transform duration-500 group-hover:scale-110 animate-float" 
                  priority
                />
              </div>
              <div className="mt-3 space-y-0.5 text-center relative z-10">
                <p className="text-[10px] font-black text-white uppercase tracking-wider">Deep Work</p>
                <p className="text-[9px] text-zinc-400 font-medium">Optimized developer workspaces</p>
              </div>
            </div>

            {/* 3D Card 2: Daily Brew */}
            <div 
              className="bg-zinc-900/60 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-between backdrop-blur-xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-2 hover:border-[#8e43ac]/50 hover:shadow-[0_20px_40px_rgba(142,67,172,0.25)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * -0.5}deg) rotateY(${tiltY * -0.5}deg)` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#8e43ac]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex-1 flex items-center justify-center min-h-[85px] relative w-full">
                <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-amber-500/15 blur-md group-hover:bg-amber-500/30 transition-all duration-500" />
                <Image 
                  src="/ants/coffee-cup-ant.png" 
                  alt="Daily Energy Coffee Ant" 
                  width={58} 
                  height={62} 
                  className="object-contain transition-transform duration-500 group-hover:scale-110 animate-float" 
                  priority
                />
              </div>
              <div className="mt-3 space-y-0.5 text-center relative z-10">
                <p className="text-[10px] font-black text-white uppercase tracking-wider">Daily Brew</p>
                <p className="text-[9px] text-zinc-400 font-medium">Active syncs & high energy</p>
              </div>
            </div>

            {/* 3D Card 3: Precision Analytics */}
            <div 
              className="bg-zinc-900/60 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-between backdrop-blur-xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-2 hover:border-[#8e43ac]/50 hover:shadow-[0_20px_40px_rgba(142,67,172,0.25)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * 0.5}deg) rotateY(${tiltY * -0.5}deg)` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#8e43ac]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex-1 flex items-center justify-center min-h-[85px] relative w-full">
                <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-emerald-500/15 blur-md group-hover:bg-emerald-500/30 transition-all duration-500" />
                <Image 
                  src="/ants/microscope-science-ant.png" 
                  alt="Precision Science Ant" 
                  width={62} 
                  height={62} 
                  className="object-contain transition-transform duration-500 group-hover:scale-110 animate-float" 
                  priority
                />
              </div>
              <div className="mt-3 space-y-0.5 text-center relative z-10">
                <p className="text-[10px] font-black text-white uppercase tracking-wider">Precision Analytics</p>
                <p className="text-[9px] text-zinc-400 font-medium">Geofenced timesheets & telemetry</p>
              </div>
            </div>

            {/* 3D Card 4: Goal Execution */}
            <div 
              className="bg-zinc-900/60 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-between backdrop-blur-xl shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-2 hover:border-[#8e43ac]/50 hover:shadow-[0_20px_40px_rgba(142,67,172,0.25)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * -0.5}deg) rotateY(${tiltY * 0.5}deg)` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#8e43ac]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex-1 flex items-center justify-center min-h-[85px] relative w-full">
                <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-rose-500/15 blur-md group-hover:bg-rose-500/30 transition-all duration-500" />
                <Image 
                  src="/ants/blueprints-walking-ant.png" 
                  alt="Sprint Blueprints Ant" 
                  width={68} 
                  height={62} 
                  className="object-contain transition-transform duration-500 group-hover:scale-110 animate-float" 
                  priority
                />
              </div>
              <div className="mt-3 space-y-0.5 text-center relative z-10">
                <p className="text-[10px] font-black text-white uppercase tracking-wider">Goal Execution</p>
                <p className="text-[9px] text-zinc-400 font-medium">Sprint reports & milestones</p>
              </div>
            </div>

          </div>

          {/* Location & Tech tag */}
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-3 pt-2">
            <span>BHUBANESWAR HQ</span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span>SAAS HRMS SUITE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
