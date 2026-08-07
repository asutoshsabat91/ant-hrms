"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { Zap, ShieldCheck, Sparkles, Activity, Command, Cpu, Globe, Radio, Flame, Orbit, Rocket, Crosshair } from "lucide-react";

// Full-Screen Zero-Latency Hyper-Quantum Particle Matrix
function QuantumLaserCanvas() {
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

    // Particle nodes with higher velocity & magnetic response
    const particleCount = 110;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 800,
      vx: (Math.random() - 0.5) * 2.5,
      vy: (Math.random() - 0.5) * 2.5,
      vz: Math.random() * 4 + 1.5,
      radius: Math.random() * 3 + 1.5,
      color: Math.random() > 0.4 ? "#d882ff" : Math.random() > 0.5 ? "#00f0ff" : "#8e43ac",
    }));

    // Mouse tracking with instant interpolation
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;
    let currentMouseX = width / 2;
    let currentMouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Dynamic Trail Sparkles
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];

    const render = () => {
      // Zero-lag lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.4;
      currentMouseY += (targetMouseY - currentMouseY) * 0.4;

      ctx.clearRect(0, 0, width, height);

      // Create spark trail on mouse move
      if (Math.hypot(targetMouseX - currentMouseX, targetMouseY - currentMouseY) > 2) {
        for (let s = 0; s < 2; s++) {
          sparks.push({
            x: currentMouseX,
            y: currentMouseY,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1.0,
            color: Math.random() > 0.5 ? "#d882ff" : "#00f0ff",
          });
        }
      }

      // Render sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.life -= 0.04;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.life * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = spark.color;
        ctx.shadowColor = spark.color;
        ctx.shadowBlur = 15;
        ctx.fill();
      }

      // Draw Laser Matrix Mesh
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z -= p.vz;

        if (p.z <= 0) p.z = 800;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const k = 600 / (600 + p.z);
        const px = (p.x - width / 2) * k + width / 2;
        const py = (p.y - height / 2) * k + height / 2;
        const size = p.radius * k * 1.8;

        // Instant mouse magnetic attraction
        const dx = currentMouseX - px;
        const dy = currentMouseY - py;
        const dist = Math.hypot(dx, dy);

        if (dist < 260) {
          const force = (260 - dist) / 260;
          ctx.strokeStyle = `rgba(216, 130, 255, ${0.7 * force})`;
          ctx.lineWidth = 1.5 * force * k;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(currentMouseX, currentMouseY);
          ctx.stroke();

          // Accelerate node towards mouse
          p.x += (dx / dist) * force * 3;
          p.y += (dy / dist) * force * 3;
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 18 * k;
        ctx.fill();

        // Connect node links
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const k2 = 600 / (600 + p2.z);
          const px2 = (p2.x - width / 2) * k2 + width / 2;
          const py2 = (p2.y - height / 2) * k2 + height / 2;
          const pDist = Math.hypot(px - px2, py - py2);

          if (pDist < 140) {
            const alpha = (1 - pDist / 140) * 0.45;
            ctx.strokeStyle = `rgba(142, 67, 172, ${alpha})`;
            ctx.lineWidth = 1 * k;
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

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Fast 60 FPS Direct DOM mouse tracking for instant 3D tilt response
  useEffect(() => {
    let animFrame: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetX = ((e.clientY / innerHeight) - 0.5) * -28; // -14 to 14 deg
      targetY = ((e.clientX / innerWidth) - 0.5) * 28;  // -14 to 14 deg
    };

    const updateTilt = () => {
      currentX += (targetX - currentX) * 0.35; // Fast zero-lag lerp
      currentY += (targetY - currentY) * 0.35;

      if (cardRef.current) {
        cardRef.current.style.transform = `rotateX(${currentX}deg) rotateY(${currentY}deg) translateZ(30px)`;
      }
      animFrame = requestAnimationFrame(updateTilt);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animFrame = requestAnimationFrame(updateTilt);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-full bg-[#020204] text-white font-sans selection:bg-[#d882ff]/40 selection:text-[#d882ff] relative overflow-hidden flex flex-col lg:flex-row items-stretch"
    >
      {/* Full-Screen Quantum Laser Particle Canvas */}
      <QuantumLaserCanvas />

      {/* Cyber Grid Isometric Overlay on BOTH sides */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff0c_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0c_1px,transparent_1px)] bg-[size:45px_45px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_90%,transparent_100%)] pointer-events-none z-0" />

      {/* Glowing Neon Laser Pulses on BOTH Left & Right Edges */}
      <div className="fixed top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-[#d882ff] to-transparent shadow-[0_0_20px_#d882ff] z-20" />
      <div className="fixed top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-[#00f0ff] to-transparent shadow-[0_0_20px_#00f0ff] z-20" />

      {/* ── Left Side: Instant-Response 3D Spatial Sign-In Portal ───── */}
      <div className="w-full lg:w-5/12 flex flex-col justify-between p-6 sm:p-10 md:p-14 relative z-10 min-h-screen">
        
        {/* Header Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-zinc-950/90 border border-white/30 backdrop-blur-2xl shadow-[0_0_35px_rgba(142,67,172,0.5)] relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#d882ff]/40 to-transparent animate-slow-spin opacity-60" />
              <Image src="/logo.png" alt="AntBox Logo" width={120} height={35} className="object-contain filter invert brightness-200 contrast-125 relative z-10" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#8e43ac]/40 to-[#00f0ff]/40 border border-[#d882ff] backdrop-blur-2xl shadow-[0_0_25px_rgba(216,130,255,0.6)]">
              <Zap className="h-3.5 w-3.5 text-[#00f0ff] animate-bounce" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">HYPER QUANTUM 3D</span>
            </div>
          </div>
        </div>

        {/* 3D Glass Sign-in Card with Fast Laser Beams */}
        <div className="w-full max-w-[460px] mx-auto py-6 [perspective:1500px]">
          <div 
            ref={cardRef}
            className="w-full rounded-[36px] bg-zinc-950/90 border border-white/30 p-8 sm:p-10 backdrop-blur-3xl shadow-[0_40px_100px_-15px_rgba(0,0,0,0.95),0_0_60px_rgba(142,67,172,0.4)] transition-transform ease-out relative group overflow-hidden"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* FAST LASER SCANNING BEAMS */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent shadow-[0_0_20px_#00f0ff] animate-pulse" />
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#d882ff] to-transparent shadow-[0_0_20px_#d882ff] animate-pulse" />

            <div className="space-y-6 relative z-10">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#8e43ac]/40 via-[#d882ff]/40 to-[#00f0ff]/40 border border-[#d882ff] text-[9px] font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(216,130,255,0.5)]">
                  <Crosshair className="h-3 w-3 text-[#00f0ff] animate-spin" /> ZERO-LATENCY ENCRYPTION
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white pt-1">
                  Sign in <span className="text-sm font-light italic-serif text-[#00f0ff] drop-shadow-[0_0_12px_rgba(0,240,255,0.9)]">to AntBox</span>
                </h2>
                <p className="text-xs text-zinc-300 font-medium">Enter credentials to unlock Quantum People Portal</p>
              </div>

              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-[#00f0ff]" />
                  <p className="text-[10px] text-zinc-300 font-black uppercase tracking-widest">Initializing Quantum Core...</p>
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
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400 border-t border-white/15 pt-5">
          <span className="flex items-center gap-2 text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_12px_#00f0ff] animate-ping" />
            QUANTUM MATRIX ONLINE
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-300 tracking-wider">PEOPLE@THEANTBOX.COM</span>
        </div>
      </div>

      {/* ── Right Side: Mind-Blowing Fast Laser 3D Stage ──────────── */}
      <div className="hidden lg:flex lg:w-7/12 flex-col justify-center items-center p-10 xl:p-16 relative z-10 border-l border-white/20 bg-zinc-950/75 backdrop-blur-2xl overflow-hidden select-none">
        
        {/* Pulsing Dual Plasma Orbs on Right Side */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] bg-gradient-to-tr from-[#8e43ac]/40 via-[#00f0ff]/25 to-[#d882ff]/30 rounded-full blur-[170px] pointer-events-none" />

        <div className="w-full max-w-2xl space-y-10 text-center relative z-10 [perspective:1800px]">
          
          {/* Header Typography */}
          <div className="space-y-4 relative">
            <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-zinc-900/90 border border-[#d882ff] backdrop-blur-2xl shadow-[0_0_40px_rgba(216,130,255,0.5)]">
              <Orbit className="h-4 w-4 text-[#00f0ff] animate-spin" />
              <p className="text-[11px] font-black uppercase tracking-widest text-white">SPATIAL WORKFORCE ENGINE</p>
            </div>
            
            <h1 className="text-5xl xl:text-6xl font-black tracking-tight text-white leading-none max-w-xl mx-auto">
              Bridging Hires to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#00f0ff] to-[#d882ff] drop-shadow-[0_0_45px_rgba(0,240,255,0.8)]">
                SaaS Careers
              </span>
            </h1>

            <p className="text-xs xl:text-sm text-zinc-200 max-w-lg mx-auto leading-relaxed font-semibold pt-1">
              Manage employee onboarding, geofenced GPS telemetry, leave policies, and automated payroll in a zero-latency 3D spatial workspace.
            </p>
          </div>

          {/* 3D Laser Modules Grid */}
          <div className="grid grid-cols-2 gap-6 px-2 text-left">
            
            {/* Module 1: Instant Attendance */}
            <div 
              className="bg-zinc-950/90 border border-[#d882ff]/40 p-6 rounded-[30px] backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(216,130,255,0.25)] transition-all duration-300 hover:-translate-y-3 hover:scale-[1.04] hover:border-[#00f0ff] hover:shadow-[0_35px_70px_rgba(0,240,255,0.5)] group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent shadow-[0_0_15px_#00f0ff]" />
              <div className="absolute -top-14 -right-14 w-32 h-32 bg-[#d882ff]/30 rounded-full blur-2xl group-hover:bg-[#00f0ff]/50 transition-all duration-300" />
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#8e43ac] via-[#d882ff] to-[#00f0ff] p-0.5 shadow-[0_0_30px_rgba(216,130,255,0.7)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-[#00f0ff] group-hover:scale-125 group-hover:rotate-12 transition-all duration-200" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Instant Attendance</p>
              <p className="text-[11px] text-zinc-300 font-medium mt-1 leading-relaxed">Geofenced GPS telemetry & fast remote clock-ins.</p>
            </div>

            {/* Module 2: Zero-Trust Security */}
            <div 
              className="bg-zinc-950/90 border border-emerald-500/40 p-6 rounded-[30px] backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(16,185,129,0.25)] transition-all duration-300 hover:-translate-y-3 hover:scale-[1.04] hover:border-emerald-300 hover:shadow-[0_35px_70px_rgba(16,185,129,0.5)] group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981]" />
              <div className="absolute -top-14 -right-14 w-32 h-32 bg-emerald-500/30 rounded-full blur-2xl group-hover:bg-emerald-400/50 transition-all duration-300" />
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 p-0.5 shadow-[0_0_30px_rgba(16,185,129,0.7)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-emerald-400 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-200" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Zero-Trust Isolation</p>
              <p className="text-[11px] text-zinc-300 font-medium mt-1 leading-relaxed">Strict role-based payroll & employee data protection.</p>
            </div>

            {/* Module 3: Live Workspace Pulse */}
            <div 
              className="bg-zinc-950/90 border border-cyan-500/40 p-6 rounded-[30px] backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(6,182,212,0.25)] transition-all duration-300 hover:-translate-y-3 hover:scale-[1.04] hover:border-cyan-300 hover:shadow-[0_35px_70px_rgba(6,182,212,0.5)] group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#06b6d4]" />
              <div className="absolute -top-14 -right-14 w-32 h-32 bg-cyan-500/30 rounded-full blur-2xl group-hover:bg-cyan-400/50 transition-all duration-300" />
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-400 p-0.5 shadow-[0_0_30px_rgba(6,182,212,0.7)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-cyan-400 group-hover:scale-125 group-hover:rotate-12 transition-all duration-200" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Live Workspace Pulse</p>
              <p className="text-[11px] text-zinc-300 font-medium mt-1 leading-relaxed">Real-time attendance logs & headcount analytics.</p>
            </div>

            {/* Module 4: Automated Payroll */}
            <div 
              className="bg-zinc-950/90 border border-amber-500/40 p-6 rounded-[30px] backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-3 hover:scale-[1.04] hover:border-amber-300 hover:shadow-[0_35px_70px_rgba(245,158,11,0.5)] group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b]" />
              <div className="absolute -top-14 -right-14 w-32 h-32 bg-amber-500/30 rounded-full blur-2xl group-hover:bg-amber-400/50 transition-all duration-300" />
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 p-0.5 shadow-[0_0_30px_rgba(245,158,11,0.7)] mb-4 flex items-center justify-center">
                <div className="h-full w-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
                  <Cpu className="h-6 w-6 text-amber-400 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-200" />
                </div>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-wider">Automated Payroll</p>
              <p className="text-[11px] text-zinc-300 font-medium mt-1 leading-relaxed">1-click salary calculations & slip generation.</p>
            </div>

          </div>

          {/* System Telemetry Bar */}
          <div className="inline-flex items-center gap-4 px-6 py-2.5 rounded-full bg-zinc-950/90 border border-white/20 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,240,255,0.3)] text-[10px] font-black uppercase tracking-widest text-zinc-300 select-none">
            <span className="flex items-center gap-1.5 text-[#00f0ff]">
              <Globe className="h-3.5 w-3.5" /> BHUBANESWAR HQ
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-white">SAAS HRMS SUITE</span>
            <span className="text-zinc-600">•</span>
            <span className="text-[#00f0ff] font-bold">100% QUANTUM HEALTHY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
