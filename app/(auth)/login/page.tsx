"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Activity, ShieldCheck, Cpu, Zap, Radio, Database } from "lucide-react";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Mouse positions for 3D card tilt & ambient lighting spot
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXGlobal = useMotionValue(0);
  const mouseYGlobal = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const globalXSpring = useSpring(mouseXGlobal, { stiffness: 80, damping: 25 });
  const globalYSpring = useSpring(mouseYGlobal, { stiffness: 80, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    mouseXGlobal.set(clientX);
    mouseYGlobal.set(clientY);
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleCardMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const titleText = "ANTBOX HRMS";
  const words = titleText.split(" ");

  if (!mounted) return <div className="min-h-screen bg-[#030308]" />;

  return (
    <div 
      onMouseMove={handleContainerMouseMove}
      className="relative min-h-screen w-full bg-[#030308] text-zinc-100 font-sans selection:bg-[#00f0ff]/30 selection:text-white flex flex-col items-center justify-center overflow-hidden"
    >
      
      {/* 1. INTERACTIVE NEON CURSOR SPOTLIGHT */}
      <motion.div 
        style={{
          x: globalXSpring,
          y: globalYSpring,
          translateX: "-50%",
          translateY: "-50%",
        }}
        className="pointer-events-none fixed top-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.15)_0%,rgba(176,38,255,0.1)_35%,transparent_70%)] blur-[80px] z-0 transition-opacity duration-300"
      />

      {/* 2. WEB3 ANIMATED BACKGROUND CANVAS LAYER */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        
        {/* Deep Cyber Gradient Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#090918_0%,#030308_75%)]" />

        {/* Dynamic Infinite Moving Horizon Grid */}
        <div className="absolute inset-0 perspective-[1000px] overflow-hidden opacity-30">
          <motion.div 
            animate={{ 
              backgroundPositionY: ["0px", "60px"] 
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute inset-[-100%] top-[35%] bg-[linear-gradient(to_right,#00f0ff15_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff15_1px,transparent_1px)] bg-[size:3.75rem_3.75rem] [mask-image:linear-gradient(to_top,#000_25%,transparent_85%)]"
            style={{ 
              transform: "rotateX(78deg)", 
              transformOrigin: "top center" 
            }}
          />
        </div>

        {/* Curved Neon Laser Streams (SVG Animated Light Beams) */}
        <svg className="absolute inset-0 w-full h-full opacity-60">
          <defs>
            <linearGradient id="neonGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#b026ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ff007f" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="neonGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff007f" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#00f0ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#b026ff" stopOpacity="0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Animated Path Stream 1 */}
          <motion.path
            d="M -100 200 Q 400 -50 900 350 T 1900 100"
            fill="none"
            stroke="url(#neonGradient1)"
            strokeWidth="3"
            filter="url(#glow)"
            strokeDasharray="200 600"
            animate={{ strokeDashoffset: [800, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          {/* Animated Path Stream 2 */}
          <motion.path
            d="M -200 600 Q 500 900 1200 400 T 2000 700"
            fill="none"
            stroke="url(#neonGradient2)"
            strokeWidth="2.5"
            filter="url(#glow)"
            strokeDasharray="150 500"
            animate={{ strokeDashoffset: [0, 650] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        </svg>

        {/* Ambient Glowing Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.25, 1],
            x: ["-5%", "5%", "-5%"],
            opacity: [0.35, 0.6, 0.35]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] w-[700px] h-[700px] bg-gradient-to-tr from-[#b026ff]/30 via-[#00f0ff]/20 to-transparent blur-[140px] rounded-full mix-blend-screen"
        />

        <motion.div 
          animate={{ 
            scale: [1.2, 0.95, 1.2],
            x: ["5%", "-5%", "5%"],
            opacity: [0.4, 0.65, 0.4]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[10%] -right-[10%] w-[800px] h-[800px] bg-gradient-to-bl from-[#00f0ff]/25 via-[#ff007f]/20 to-transparent blur-[160px] rounded-full mix-blend-screen"
        />

        {/* Floating Web3 Particles Matrix */}
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * 1400 - 200,
              y: Math.random() * 900,
              opacity: Math.random() * 0.7 + 0.2,
              scale: Math.random() * 0.8 + 0.4,
            }}
            animate={{
              y: [-20, -1000],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
            className="absolute w-1.5 h-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]"
          />
        ))}

        {/* Floating 3D Geometric Web3 Cyber Spheres / Rings */}
        <motion.div
          animate={{ 
            y: [-15, 15, -15],
            rotateX: [0, 180, 360],
            rotateY: [0, 360, 0],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[18%] right-[14%] w-28 h-28 border border-[#00f0ff]/40 rounded-full shadow-[0_0_30px_rgba(0,240,255,0.25)] backdrop-blur-md flex items-center justify-center"
        >
          <div className="w-16 h-16 border border-[#b026ff]/50 rounded-full animate-ping opacity-30" />
          <div className="w-10 h-10 border border-[#00f0ff] rounded-full bg-[#00f0ff]/10" />
        </motion.div>

        <motion.div
          animate={{ 
            y: [20, -20, 20],
            rotateZ: [0, 360],
            rotateX: [360, 0],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[22%] left-[10%] w-36 h-36 border border-[#b026ff]/30 rounded-2xl shadow-[0_0_40px_rgba(176,38,255,0.2)] backdrop-blur-md flex items-center justify-center"
        >
          <div className="w-20 h-20 border border-white/20 rotate-45 rounded-lg" />
        </motion.div>
      </div>

      {/* 3. TOP NAVIGATION */}
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute top-0 left-0 w-full p-6 sm:p-8 flex items-center justify-between z-20"
      >
        <div className="flex items-center gap-3">
          <Image 
            src="/logo.png" 
            alt="AntBox Logo" 
            width={120} 
            height={36} 
            className="object-contain brightness-0 invert opacity-95 hover:scale-105 transition-transform" 
            priority 
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-[#0a0a14]/90 border border-white/10 px-3.5 py-1.5 rounded-full text-[11px] font-mono text-zinc-400 backdrop-blur-xl">
            <Radio className="w-3.5 h-3.5 text-[#00f0ff] animate-pulse" />
            <span className="text-zinc-300">NET: <span className="text-[#00f0ff]">MAINNET_v2.4</span></span>
          </div>

          <div className="flex items-center gap-2.5 bg-[#090912]/90 border border-[#00f0ff]/30 px-4 py-1.5 rounded-full backdrop-blur-xl shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f0ff]" />
            </span>
            <span className="text-[10px] font-mono tracking-widest text-[#00f0ff] uppercase font-semibold">Node Status: Operational</span>
          </div>
        </div>
      </motion.nav>

      {/* 4. MAIN HERO & CONTENT */}
      <main className="relative z-10 flex flex-col items-center w-full max-w-6xl px-6 pt-24 pb-16 perspective-[1200px]">
        
        {/* Floating Web3 Telemetry Badges Left & Right */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="hidden lg:flex absolute left-0 top-[35%] flex-col gap-3 backdrop-blur-xl bg-[#090914]/70 border border-white/10 p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-20 text-[11px] font-mono text-zinc-300"
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
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="hidden lg:flex absolute right-0 top-[35%] flex-col gap-3 backdrop-blur-xl bg-[#090914]/70 border border-white/10 p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-20 text-[11px] font-mono text-zinc-300"
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
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-2 text-xs font-mono rounded-full bg-gradient-to-r from-[#00f0ff]/10 via-[#b026ff]/10 to-[#ff007f]/10 border border-[#00f0ff]/30 text-[#00f0ff] backdrop-blur-md shadow-[0_0_25px_rgba(0,240,255,0.2)] uppercase tracking-widest"
          >
            <Zap className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>ENTERPRISE WEB3 HUMAN CAPITAL ENGINE</span>
          </motion.div>
          
          <h1 className="text-5xl sm:text-7xl md:text-[6.5rem] font-black tracking-tighter text-white mb-4 flex flex-wrap justify-center gap-x-5 drop-shadow-[0_0_35px_rgba(0,240,255,0.3)]">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 30, rotateX: 90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, delay: 0.15 * i, ease: [0.2, 0.65, 0.3, 0.9] }}
                className={
                  word === "HRMS" 
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-[#b026ff] to-[#ff007f] animate-pulse" 
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
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-zinc-400 text-sm sm:text-lg max-w-2xl mx-auto font-light leading-relaxed tracking-wide"
          >
            Autonomous payroll processing, decentralized identity verification, and real-time workforce telemetry—engineered for modern organizations.
          </motion.p>
        </div>

        {/* 5. INTERACTIVE 3D WEB3 LOGIN CARD */}
        <motion.div 
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[440px] relative z-30 group"
        >
          {/* Animated Outer Cyber Neon Border Effect */}
          <div className="absolute -inset-[2px] bg-gradient-to-br from-[#00f0ff] via-[#b026ff] to-[#ff007f] rounded-[24px] opacity-40 group-hover:opacity-100 blur-[10px] transition-all duration-700 pointer-events-none" />
          
          <div 
            style={{ transform: "translateZ(35px)" }}
            className="bg-[#060610]/85 backdrop-blur-2xl border border-white/15 rounded-[22px] p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative z-10 overflow-hidden"
          >
            {/* Corner Tech Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00f0ff] rounded-tl-[22px]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#b026ff] rounded-tr-[22px]" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#b026ff] rounded-bl-[22px]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00f0ff] rounded-br-[22px]" />

            {/* Glowing Reflection Ray */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />
            
            <div className="mb-6 text-center" style={{ transform: "translateZ(45px)" }}>
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00f0ff]/20 to-[#b026ff]/20 border border-[#00f0ff]/40 mb-3 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                <Activity className="w-5 h-5 text-[#00f0ff]" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight font-sans">Enterprise Portal</h2>
              <p className="text-xs text-zinc-400 mt-1 font-mono">AUTHENTICATE TO ACCESS YOUR DASHBOARD</p>
            </div>

            <div style={{ transform: "translateZ(25px)" }}>
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
      
      {/* 6. FOOTER */}
      <footer className="absolute bottom-6 w-full text-center z-10">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
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

