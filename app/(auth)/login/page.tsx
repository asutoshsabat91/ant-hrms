"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { Zap, ShieldCheck, Sparkles, Activity, Command, Cpu, Globe, Radio, ShieldAlert, Flame, Orbit } from "lucide-react";

// Interactive 3D Holographic Particle Matrix Canvas
function HolographicParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle nodes
    const particleCount = 75;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 1000,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      vz: Math.random() * 2 + 0.5,
      radius: Math.random() * 2.5 + 1,
      color: Math.random() > 0.5 ? "#d882ff" : "#8e43ac",
    }));

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint cyber grid backdrop
      ctx.strokeStyle = "rgba(142, 67, 172, 0.04)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update & render particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z -= p.vz;

        if (p.z <= 0) p.z = 1000;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Perspective scale factor
        const k = 600 / (600 + p.z);
        const px = (p.x - width / 2) * k + width / 2;
        const py = (p.y - height / 2) * k + height / 2;
        const size = p.radius * k * 1.5;

        // Mouse attraction force
        const dx = mouseX - px;
        const dy = mouseY - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          ctx.strokeStyle = `rgba(216, 130, 255, ${0.4 * (1 - dist / 180)})`;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(mouseX, mouseY);
          ctx.stroke();
        }

        // Draw particle node
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = "#d882ff";
        ctx.shadowBlur = 12 * k;
        ctx.fill();

        // Connect nearby particles with laser links
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const k2 = 600 / (600 + p2.z);
          const px2 = (p2.x - width / 2) * k2 + width / 2;
          const py2 = (p2.y - height / 2) * k2 + height / 2;
          const pDist = Math.hypot(px - px2, py - py2);

          if (pDist < 110) {
            ctx.strokeStyle = `rgba(142, 67, 172, ${0.2 * (1 - pDist / 110)})`;
            ctx.lineWidth = 0.8 * k;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px2, py2);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}

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

  // 3D Spatial Tilt Calculation
  const tiltX = (mousePos.y - 0.5) * -20; // -10 to 10 deg
  const tiltY = (mousePos.x - 0.5) * 20;  // -10 to 10 deg
  const auraX = mousePos.x * 100;
  const auraY = mousePos.y * 100;

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-full bg-[#030305] text-white font-sans selection:bg-[#d882ff]/40 selection:text-[#d882ff] relative overflow-hidden flex flex-col lg:flex-row items-stretch"
    >
      {/* 3D Holographic Particle Matrix Canvas */}
      <HolographicParticleCanvas />

      {/* Dynamic Cursor-Tracking Glowing Laser Mesh */}
      <div 
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 z-0"
        style={{
          background: `
            radial-gradient(1100px circle at ${auraX}% ${auraY}%, rgba(142, 67, 172, 0.35), rgba(216, 130, 255, 0.12) 35%, transparent 75%),
            radial-gradient(700px circle at ${100 - auraX}% ${100 - auraY}%, rgba(112, 51, 135, 0.25), transparent 60%)
          `,
        }}
      />

      {/* ── Left Column: 3D Cyber Glass Sign-In Portal ──────────── */}
      <div className="w-full lg:w-5/12 flex flex-col justify-between p-6 sm:p-10 md:p-14 relative z-10 min-h-screen">
        
        {/* Header Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-zinc-950/80 border border-white/20 backdrop-blur-2xl shadow-[0_0_30px_rgba(142,67,172,0.4)] relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#d882ff]/30 to-transparent animate-slow-spin opacity-50" />
              <Image src="/logo.png" alt="AntBox Logo" width={115} height={34} className="object-contain filter invert brightness-200 contrast-125 relative z-10" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#8e43ac]/20 border border-[#d882ff]/50 backdrop-blur-xl shadow-[0_0_20px_rgba(216,130,255,0.4)]">
              <Radio className="h-3 w-3 text-[#d882ff] animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">QUANTUM 3D</span>
            </div>
          </div>
        </div>

        {/* 3D Spatial Glass Sign-in Card */}
        <div className="w-full max-w-[450px] mx-auto py-6 [perspective:1400px]">
          <div 
            className="w-full rounded-[32px] bg-zinc-950/85 border border-white/25 p-8 sm:p-10 backdrop-blur-3xl shadow-[0_35px_80px_-15px_rgba(0,0,0,0.95),0_0_50px_rgba(142,67,172,0.35)] transition-transform duration-150 ease-out relative group overflow-hidden"
            style={{
              transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(20px)`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Animated Laser Border Beam */}
            <div className="absolute -top-[2px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d882ff] to-transparent shadow-[0_0_15px_#d882ff]" />
            <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8e43ac] to-transparent shadow-[0_0_15px_#8e43ac]" />

            <div className="space-y-6 relative z-10">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#8e43ac]/30 to-[#d882ff]/30 border border-[#d882ff]/40 text-[9px] font-black uppercase tracking-widest text-[#d882ff] shadow-[0_0_15px_rgba(216,130,255,0.3)]">
                  <Flame className="h-3 w-3 text-[#d882ff] animate-bounce" /> ENCRYPTED PORTAL
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white pt-1">
                  Sign in <span className="text-sm font-light italic-serif text-[#d882ff] drop-shadow-[0_0_10px_rgba(216,130,255,0.8)]">to Workspace</span>
                </h2>
                <p className="text-xs text-zinc-400 font-medium">Enter credentials to unlock AntBox Cyber Platform</p>
              </div>

              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-[#d882ff]" />
                  <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Initializing Holographic Core...</p>
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
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400 border-t border-white/10 pt-5">
          <span className="flex items-center gap-2 text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981] animate-pulse" />
            COLONY CORE ONLINE
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 tracking-wider">PEOPLE@THEANTBOX.COM</span>
        </div>
      </div>

      {/* ── Right Column: Mind-Blowing 3D Spatial Holographic Stage ────── */}
      <div className="hidden lg:flex lg:w-7/12 flex-col justify-center items-center p-10 xl:p-16 relative z-10 border-l border-white/15 bg-zinc-950/70 backdrop-blur-xl overflow-hidden select-none">
        
        {/* Pulsing Holographic Core Plasma */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-[#8e43ac]/30 via-[#703387]/20 to-[#d882ff]/20 rounded-full blur-[160px] pointer-events-none" />

        <div className="w-full max-w-2xl space-y-10 text-center relative z-10 [perspective:1600px]">
          
          {/* Header Typography */}
          <div className="space-y-4 relative">
            <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-2xl shadow-[0_0_35px_rgba(142,67,172,0.4)]">
              <Orbit className="h-4 w-4 text-[#d882ff] animate-spin" />
              <p className="text-[11px] font-black uppercase tracking-widest text-[#d882ff]">SPATIAL WORKFORCE ARCHITECTURE</p>
            </div>
            
            <h1 className="text-4xl xl:text-6xl font-black tracking-tight text-white leading-none max-w-xl mx-auto">
              Bridging Hires to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#d882ff] to-[#8e43ac] drop-shadow-[0_0_40px_rgba(216,130,255,0.7)]">
                SaaS Careers
              </span>
            </h1>

            <p className="text-xs xl:text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed font-semibold pt-1">
              Manage employee onboarding, geofenced GPS telemetry, leave policies, and automated payroll in an ultra-futuristic spatial workspace.
            </p>
          </div>

          {/* 3D Holographic Telemetry Cards Grid */}
          <div className="grid grid-cols-2 gap-6 px-2 text-left">
            
            {/* Tile 1: Instant Attendance */}
            <div 
              className="bg-zinc-950/80 border border-white/20 p-6 rounded-[28px] backdrop-blur-3xl shadow-[0_25px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(142,67,172,0.2)] transition-all duration-500 hover:-translate-y-3 hover:scale-[1.03] hover:rotate-1 hover:border-[#d882ff] hover:shadow-[0_30px_60px_rgba(216,130,255,0.4)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * 0.7}deg) rotateY(${tiltY * 0.7}deg) translateZ(30px)` }}
            >
              <div className="absolute -top-14 -right-14 w-32 h-32 bg-[#8e43ac]/30 rounded-full blur-2xl group-hover:bg-[#d882ff]/50 transition-all duration-500" />
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#8e43ac] to-[#d882ff] p-0.5 shadow-[0_0_25px_rgba(216,130,255,0.6)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-[#d882ff] group-hover:scale-125 group-hover:rotate-12 transition-all duration-300" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Instant Attendance</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">Geofenced GPS telemetry & fast remote clock-ins.</p>
            </div>

            {/* Tile 2: Zero-Trust Security */}
            <div 
              className="bg-zinc-950/80 border border-white/20 p-6 rounded-[28px] backdrop-blur-3xl shadow-[0_25px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.2)] transition-all duration-500 hover:-translate-y-3 hover:scale-[1.03] hover:-rotate-1 hover:border-emerald-400 hover:shadow-[0_30px_60px_rgba(16,185,129,0.4)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * -0.7}deg) rotateY(${tiltY * -0.7}deg) translateZ(30px)` }}
            >
              <div className="absolute -top-14 -right-14 w-32 h-32 bg-emerald-500/30 rounded-full blur-2xl group-hover:bg-emerald-400/50 transition-all duration-500" />
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 p-0.5 shadow-[0_0_25px_rgba(16,185,129,0.6)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-400 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-300" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Zero-Trust Isolation</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">Strict role-based payroll & employee data protection.</p>
            </div>

            {/* Tile 3: Live Workspace Pulse */}
            <div 
              className="bg-zinc-950/80 border border-white/20 p-6 rounded-[28px] backdrop-blur-3xl shadow-[0_25px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.2)] transition-all duration-500 hover:-translate-y-3 hover:scale-[1.03] hover:-rotate-1 hover:border-cyan-400 hover:shadow-[0_30px_60px_rgba(6,182,212,0.4)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * 0.7}deg) rotateY(${tiltY * -0.7}deg) translateZ(30px)` }}
            >
              <div className="absolute -top-14 -right-14 w-32 h-32 bg-cyan-500/30 rounded-full blur-2xl group-hover:bg-cyan-400/50 transition-all duration-500" />
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-400 p-0.5 shadow-[0_0_25px_rgba(6,182,212,0.6)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-cyan-400 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Live Workspace Pulse</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">Real-time attendance logs & headcount analytics.</p>
            </div>

            {/* Tile 4: Automated Payroll */}
            <div 
              className="bg-zinc-950/80 border border-white/20 p-6 rounded-[28px] backdrop-blur-3xl shadow-[0_25px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.2)] transition-all duration-500 hover:-translate-y-3 hover:scale-[1.03] hover:rotate-1 hover:border-amber-400 hover:shadow-[0_30px_60px_rgba(245,158,11,0.4)] group relative overflow-hidden"
              style={{ transform: `rotateX(${tiltX * -0.7}deg) rotateY(${tiltY * 0.7}deg) translateZ(30px)` }}
            >
              <div className="absolute -top-14 -right-14 w-32 h-32 bg-amber-500/30 rounded-full blur-2xl group-hover:bg-amber-400/50 transition-all duration-500" />
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.6)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <Cpu className="h-6 w-6 text-amber-400 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-300" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Automated Payroll</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">1-click salary calculations & slip generation.</p>
            </div>

          </div>

          {/* System Telemetry Bar */}
          <div className="inline-flex items-center gap-4 px-6 py-2.5 rounded-full bg-zinc-900/90 border border-white/15 backdrop-blur-2xl shadow-[0_0_20px_rgba(0,0,0,0.8)] text-[10px] font-black uppercase tracking-widest text-zinc-400 select-none">
            <span className="flex items-center gap-1.5 text-[#d882ff]">
              <Globe className="h-3.5 w-3.5" /> BHUBANESWAR HQ
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-white">SAAS HRMS SUITE</span>
            <span className="text-zinc-700">•</span>
            <span className="text-[#10b981] font-bold">100% HEALTHY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
