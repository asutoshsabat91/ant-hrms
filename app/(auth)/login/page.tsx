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
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);

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

  if (!mounted) return <div className="min-h-screen bg-[#030303]" />;

  return (
    <div className="relative min-h-screen w-full bg-[#030303] text-zinc-300 font-sans selection:bg-[#BB62DE]/30 selection:text-white flex flex-col items-center justify-center overflow-hidden">
      
      {/* 3D Animated Background Aurora / Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden perspective-[1000px]">
        {/* Deep background color */}
        <div className="absolute inset-0 bg-[#030303]" />
        
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        {/* Sweeping Aurora Beam 1 */}
        <motion.div 
          animate={{ 
            rotate: [0, 90, 0],
            scale: [1, 1.5, 1],
            x: ["-20%", "20%", "-20%"],
            y: ["-10%", "10%", "-10%"]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[70%] bg-gradient-to-r from-[#BB62DE]/40 to-purple-600/30 blur-[120px] rounded-full pointer-events-none mix-blend-screen"
        />
        
        {/* Sweeping Aurora Beam 2 */}
        <motion.div 
          animate={{ 
            rotate: [360, 180, 360],
            scale: [1.2, 1, 1.2],
            x: ["20%", "-10%", "20%"],
            y: ["10%", "-20%", "10%"]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[60%] bg-gradient-to-l from-indigo-500/30 to-[#4a1f6a]/40 blur-[130px] rounded-[100%] pointer-events-none mix-blend-screen"
        />

        {/* Center Glowing Core */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.25, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[20%] right-[20%] bottom-[20%] bg-[#BB62DE] blur-[180px] rounded-full pointer-events-none mix-blend-screen"
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
        <div className="hidden sm:flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] px-3 py-1.5 rounded-full backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BB62DE] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#BB62DE]" />
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-zinc-300 uppercase">All systems operational</span>
        </div>
      </motion.nav>

      {/* Main Content Container */}
      <main className="relative z-10 flex flex-col items-center w-full max-w-5xl px-6 pt-24 pb-16 perspective-[1200px]">
        
        {/* Header Section */}
        <div className="text-center space-y-4 mb-10 relative z-20">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center px-3 py-1 mb-4 text-xs font-medium rounded-full bg-white/[0.03] border border-white/[0.05] text-zinc-300 backdrop-blur-sm"
          >
            ✨ Introducing AntBox HRMS 2.0
          </motion.div>
          
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tighter text-white mb-6 flex flex-wrap justify-center gap-x-4 drop-shadow-2xl">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 30, rotateX: 90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, delay: 0.15 * i, ease: [0.2, 0.65, 0.3, 0.9] }}
                className={word === "HRMS" ? "text-transparent bg-clip-text bg-gradient-to-br from-[#BB62DE] to-purple-400" : ""}
              >
                {word}
              </motion.span>
            ))}
          </h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto font-light leading-relaxed"
          >
            Manage your entire workforce from a single, unified ecosystem. Telemetry, payroll, and onboarding—streamlined.
          </motion.p>
        </div>

        {/* 3D Interactive Login Card */}
        <motion.div 
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[400px] relative z-30 group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#BB62DE]/30 to-purple-600/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          
          <div 
            style={{ transform: "translateZ(30px)" }}
            className="bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/[0.08] rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative z-10"
          >
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#BB62DE]/60 to-transparent" />
            
            <div className="mb-8 text-center" style={{ transform: "translateZ(40px)" }}>
              <h2 className="text-xl font-semibold text-white tracking-tight">Sign in to your workspace</h2>
            </div>

            <div style={{ transform: "translateZ(20px)" }}>
              <Suspense fallback={
                <div className="flex justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-800 border-t-[#BB62DE]" />
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
          className="text-[11px] font-medium tracking-wide text-zinc-600 uppercase"
        >
          © {new Date().getFullYear()} Colony Network
        </motion.p>
      </footer>
    </div>
  );
}
