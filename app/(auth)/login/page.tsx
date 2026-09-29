"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { motion } from "framer-motion";
import { Activity, ShieldCheck, Cpu, Zap, Radio } from "lucide-react";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const titleText = "ANTBOX HRMS";
  const words = titleText.split(" ");

  if (!mounted) return <div className="min-h-screen bg-[#030308]" />;

  return (
    <div className="relative min-h-screen w-full bg-[#030308] text-zinc-100 font-sans selection:bg-[#00f0ff]/30 selection:text-white flex flex-col items-center justify-center overflow-hidden">
      
      {/* 1. HIGH-PERFORMANCE GPU BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Deep Cyber Radial Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#0e0a26_0%,#030308_75%)]" />

        {/* Ambient Neon Radial Lights (Pure CSS, 0 JS / 0 CPU lag) */}
        <div className="absolute -top-[15%] -left-[10%] w-[550px] h-[550px] bg-[radial-gradient(circle_at_center,rgba(176,38,255,0.18)_0%,rgba(0,240,255,0.06)_45%,transparent_70%)]" />
        <div className="absolute -bottom-[15%] -right-[10%] w-[650px] h-[650px] bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.14)_0%,rgba(255,0,127,0.06)_45%,transparent_70%)]" />

        {/* Perspective Web3 Cyber Grid */}
        <div className="absolute inset-0 perspective-[1000px] overflow-hidden opacity-20">
          <div 
            style={{ 
              transform: "rotateX(76deg)", 
              transformOrigin: "top center",
            }}
            className="absolute inset-[-100%] top-[35%] bg-[linear-gradient(to_right,#00f0ff20_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff20_1px,transparent_1px)] bg-[size:3.75rem_3.75rem] [mask-image:linear-gradient(to_top,#000_30%,transparent_85%)]"
          />
        </div>

        {/* Crisp SVG Neon Laser Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-60">
          <defs>
            <linearGradient id="neonGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#b026ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ff007f" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="neonGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff007f" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#00f0ff" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#b026ff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d="M -100 220 Q 400 -40 900 360 T 1900 120"
            fill="none"
            stroke="url(#neonGrad1)"
            strokeWidth="2.5"
            style={{ filter: "drop-shadow(0px 0px 5px #00f0ff)" }}
          />

          <path
            d="M -200 580 Q 500 880 1200 420 T 2000 680"
            fill="none"
            stroke="url(#neonGrad2)"
            strokeWidth="2"
            style={{ filter: "drop-shadow(0px 0px 5px #b026ff)" }}
          />
        </svg>

        {/* Lightweight Floating Decorative Orbs */}
        <div className="absolute top-[20%] right-[12%] w-24 h-24 border border-[#00f0ff]/30 rounded-full bg-[#00f0ff]/5 flex items-center justify-center">
          <div className="w-12 h-12 border border-[#b026ff]/40 rounded-full" />
        </div>

        <div className="absolute bottom-[20%] left-[8%] w-28 h-28 border border-[#b026ff]/30 rounded-2xl bg-[#b026ff]/5 flex items-center justify-center">
          <div className="w-14 h-14 border border-white/20 rotate-45 rounded-md" />
        </div>
      </div>

      {/* 2. TOP NAVIGATION */}
      <motion.nav 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute top-0 left-0 w-full p-6 sm:p-8 flex items-center justify-between z-20"
      >
        <div className="flex items-center gap-3">
          <Image 
            src="/logo.png" 
            alt="AntBox Logo" 
            width={120} 
            height={36} 
            className="object-contain brightness-0 invert opacity-95" 
            priority 
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-[#090912] border border-white/10 px-3.5 py-1.5 rounded-full text-[11px] font-mono text-zinc-400">
            <Radio className="w-3.5 h-3.5 text-[#00f0ff] animate-pulse" />
            <span className="text-zinc-300">NET: <span className="text-[#00f0ff]">MAINNET_v2.4</span></span>
          </div>

          <div className="flex items-center gap-2.5 bg-[#090912] border border-[#00f0ff]/30 px-4 py-1.5 rounded-full shadow-[0_0_12px_rgba(0,240,255,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f0ff]" />
            </span>
            <span className="text-[10px] font-mono tracking-widest text-[#00f0ff] uppercase font-semibold">Node Status: Operational</span>
          </div>
        </div>
      </motion.nav>

      {/* 3. MAIN HERO & CONTENT */}
      <main className="relative z-10 flex flex-col items-center w-full max-w-6xl px-6 pt-24 pb-16">
        
        {/* Floating Web3 Telemetry Badges Left & Right */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="hidden lg:flex absolute left-0 top-[35%] flex-col gap-2.5 bg-[#080812] border border-white/10 p-3.5 rounded-2xl shadow-xl z-20 text-[11px] font-mono text-zinc-300"
        >
          <div className="flex items-center gap-2 text-[#00f0ff]">
            <Cpu className="w-4 h-4" />
            <span className="font-bold tracking-wider">[ SYSTEM METRICS ]</span>
          </div>
          <div className="flex items-center justify-between gap-6 text-[10px]">
            <span className="text-zinc-500">TPS SPEED</span>
            <span className="text-emerald-400 font-bold">14,200/s</span>
          </div>
          <div className="flex items-center justify-between gap-6 text-[10px]">
            <span className="text-zinc-500">ENCRYPTION</span>
            <span className="text-[#b026ff] font-bold">AES-256-GCM</span>
          </div>
          <div className="flex items-center justify-between gap-6 text-[10px]">
            <span className="text-zinc-500">LATENCY</span>
            <span className="text-[#00f0ff] font-bold">&lt; 12ms</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="hidden lg:flex absolute right-0 top-[35%] flex-col gap-2.5 bg-[#080812] border border-white/10 p-3.5 rounded-2xl shadow-xl z-20 text-[11px] font-mono text-zinc-300"
        >
          <div className="flex items-center gap-2 text-[#b026ff]">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-bold tracking-wider">[ PROTOCOL SECURITY ]</span>
          </div>
          <div className="flex items-center justify-between gap-6 text-[10px]">
            <span className="text-zinc-500">ZERO TRUST</span>
            <span className="text-emerald-400 font-bold">VERIFIED</span>
          </div>
          <div className="flex items-center justify-between gap-6 text-[10px]">
            <span className="text-zinc-500">SESSION</span>
            <span className="text-[#00f0ff] font-bold">SECURE_JWT</span>
          </div>
        </motion.div>

        {/* Header Title Section */}
        <div className="text-center space-y-4 mb-10 relative z-20">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-2 text-xs font-mono rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] uppercase tracking-widest"
          >
            <Zap className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>ENTERPRISE WEB3 HUMAN CAPITAL ENGINE</span>
          </motion.div>
          
          <h1 className="text-5xl sm:text-7xl md:text-[6.5rem] font-black tracking-tighter text-white mb-4 flex flex-wrap justify-center gap-x-5 drop-shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 * i, ease: "easeOut" }}
                className={
                  word === "HRMS" 
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-[#b026ff] to-[#ff007f]" 
                    : "text-white"
                }
              >
                {word}
              </motion.span>
            ))}
          </h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-zinc-400 text-sm sm:text-lg max-w-2xl mx-auto font-light leading-relaxed tracking-wide"
          >
            Autonomous payroll processing, decentralized identity verification, and real-time workforce telemetry—engineered for modern organizations.
          </motion.p>
        </div>

        {/* 4. LIGHTWEIGHT ZERO-LAG LOGIN CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[440px] relative z-30 group hover:scale-[1.01] transition-transform duration-300"
        >
          {/* Cyber Neon Border Gradient */}
          <div className="absolute -inset-[1px] bg-gradient-to-br from-[#00f0ff] via-[#b026ff] to-[#ff007f] rounded-[24px] opacity-40 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none" />
          
          <div className="bg-[#080812] border border-white/10 rounded-[22px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden">
            {/* Corner Tech Brackets */}
            <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-[#00f0ff] rounded-tl-[22px]" />
            <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-[#b026ff] rounded-tr-[22px]" />
            <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-[#b026ff] rounded-bl-[22px]" />
            <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-[#00f0ff] rounded-br-[22px]" />

            {/* Reflection Line */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />
            
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/30 mb-3">
                <Activity className="w-5 h-5 text-[#00f0ff]" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight font-sans">Enterprise Portal</h2>
              <p className="text-xs text-zinc-400 mt-1 font-mono">AUTHENTICATE TO ACCESS YOUR DASHBOARD</p>
            </div>

            <div>
              <Suspense fallback={
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-[#00f0ff]" />
                </div>
              }>
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </motion.div>

      </main>
      
      {/* 5. FOOTER */}
      <footer className="absolute bottom-6 w-full text-center z-10">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase flex items-center justify-center gap-3"
        >
          <span>© {new Date().getFullYear()} ANTBOX HRMS PROTOCOL</span>
          <span className="text-zinc-700">•</span>
          <span className="text-[#00f0ff]/80">ALL SYSTEMS SECURE</span>
        </motion.p>
      </footer>
    </div>
  );
}

