"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 3D Tilt Effect for the card
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const titleText = "ANTBOX HRMS";
  const words = titleText.split(" ");

  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <div className="relative min-h-screen w-full bg-[#000000] text-zinc-300 font-sans selection:bg-[#00f0ff]/30 selection:text-white flex flex-col items-center justify-center overflow-hidden">
      
      {/* WEB3 ANIMATED BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden perspective-[1000px]">
        {/* Deep background color */}
        <div className="absolute inset-0 bg-[#020205]" />
        
        {/* Animated Perspective 3D Grid */}
        <div 
          className="absolute inset-[-100%] top-[40%] bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_top,#000_10%,transparent_80%)] opacity-40" 
          style={{ transform: "rotateX(75deg)", transformOrigin: "top center" }}
        />
        
        {/* Cyberpunk Glowing Orbs / Shapes */}
        <motion.div 
          animate={{ 
            rotate: [0, -90, 0],
            scale: [1, 1.3, 1],
            x: ["-10%", "10%", "-10%"],
            y: ["-5%", "15%", "-5%"]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[0%] left-[-15%] w-[800px] h-[600px] bg-gradient-to-tr from-[#b026ff]/30 to-[#00f0ff]/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen"
        />

        <motion.div 
          animate={{ 
            rotate: [360, 180, 360],
            scale: [1.2, 0.9, 1.2],
            x: ["10%", "-10%", "10%"],
            y: ["5%", "-15%", "5%"]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-15%] w-[900px] h-[700px] bg-gradient-to-bl from-[#00f0ff]/20 to-[#b026ff]/30 blur-[150px] rounded-full pointer-events-none mix-blend-screen"
        />

        {/* Floating 3D Geometric Elements */}
        <motion.div
          animate={{ 
            y: [-20, 20, -20],
            rotateZ: [0, 90, 180, 270, 360],
            rotateX: [0, 180, 360],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[15%] right-[20%] w-32 h-32 border-[1px] border-[#00f0ff]/20 rounded-lg shadow-[0_0_30px_rgba(0,240,255,0.1)] backdrop-blur-sm"
        />

        <motion.div
          animate={{ 
            y: [20, -20, 20],
            rotateZ: [360, 270, 180, 90, 0],
            rotateY: [0, 180, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[20%] left-[15%] w-40 h-40 border-[1px] border-[#b026ff]/20 rounded-full shadow-[0_0_40px_rgba(176,38,255,0.1)] backdrop-blur-md"
        />
      </div>

      {/* Top Navigation */}
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute top-0 left-0 w-full p-6 sm:p-8 flex items-center justify-between z-20"
      >
        <Image src="/logo.png" alt="AntBox Logo" width={110} height={32} className="object-contain brightness-0 invert opacity-90" priority />
        <div className="hidden sm:flex items-center gap-2 bg-[#09090b]/80 border border-[#00f0ff]/20 px-4 py-2 rounded-md backdrop-blur-xl shadow-[0_0_15px_rgba(0,240,255,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f0ff]" />
          </span>
          <span className="text-[10px] font-mono tracking-widest text-[#00f0ff] uppercase">Status: Operational</span>
        </div>
      </motion.nav>

      {/* Main Content Container */}
      <main className="relative z-10 flex flex-col items-center w-full max-w-5xl px-6 pt-24 pb-16 perspective-[1200px]">
        
        {/* Header Section */}
        <div className="text-center space-y-4 mb-12 relative z-20">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center px-4 py-1.5 mb-6 text-xs font-mono rounded-sm bg-[#b026ff]/10 border border-[#b026ff]/30 text-[#b026ff] backdrop-blur-md shadow-[0_0_20px_rgba(176,38,255,0.2)] uppercase tracking-widest"
          >
            [ V2.0 Initialization ]
          </motion.div>
          
          <h1 className="text-6xl sm:text-7xl md:text-[6.5rem] font-black tracking-tighter text-white mb-6 flex flex-wrap justify-center gap-x-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 30, rotateX: 90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, delay: 0.15 * i, ease: [0.2, 0.65, 0.3, 0.9] }}
                className={word === "HRMS" ? "text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#b026ff]" : ""}
              >
                {word}
              </motion.span>
            ))}
          </h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-zinc-400/80 text-sm sm:text-lg max-w-2xl mx-auto font-light leading-relaxed tracking-wide"
          >
            Manage your entire workforce from a single, unified ecosystem. Telemetry, payroll, and onboarding—streamlined for the modern era.
          </motion.p>
        </div>

        {/* 3D Web3 Interactive Login Card */}
        <motion.div 
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[420px] relative z-30 group"
        >
          {/* Neon Animated Outer Glow */}
          <div className="absolute -inset-[2px] bg-gradient-to-br from-[#00f0ff] via-transparent to-[#b026ff] rounded-[20px] opacity-30 group-hover:opacity-100 blur-[8px] transition-all duration-700 pointer-events-none" />
          
          <div 
            style={{ transform: "translateZ(30px)" }}
            className="bg-[#050508]/80 backdrop-blur-xl border border-white/[0.1] rounded-[18px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden"
          >
            {/* Corner Tech Accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00f0ff]/50 rounded-tl-[18px]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#b026ff]/50 rounded-br-[18px]" />

            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="mb-8 text-center" style={{ transform: "translateZ(40px)" }}>
              <h2 className="text-2xl font-bold text-white tracking-tight font-sans">Access Portal</h2>
            </div>

            <div style={{ transform: "translateZ(20px)" }}>
              <Suspense fallback={
                <div className="flex justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-800 border-t-[#00f0ff]" />
                </div>
              }>
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </motion.div>

      </main>
      
      {/* Footer */}
      <footer className="absolute bottom-6 w-full text-center z-10">
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase"
        >
          © {new Date().getFullYear()} Colony Network // SYSTEM_SECURE
        </motion.p>
      </footer>
    </div>
  );
}
