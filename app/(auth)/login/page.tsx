import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-white font-sans selection:bg-[#d882ff]/20 selection:text-[#8e43ac] relative overflow-hidden">
      
      {/* Left Side: Brand Logo, Welcome Text & Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 md:p-16 bg-white min-h-screen relative z-10">
        
        {/* Sketched paper plane in background of login panel */}
        <div className="absolute top-20 right-16 opacity-30 pointer-events-none hidden md:block select-none">
          <svg viewBox="0 0 100 100" className="w-24 h-24 text-[#8e43ac]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 40 L80 15 L50 85 L40 55 Z" />
            <path d="M40 55 L80 15 L50 55" />
            <path d="M10 50 Q -5 65 10 75 T 35 60" strokeDasharray="3 3" strokeWidth="1" />
          </svg>
        </div>

        {/* Brand Logo Header */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center justify-start">
            <Image src="/logo.png" alt="AntBox Logo" width={110} height={32} className="object-contain" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 select-none bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded-full">
            v3.0.0
          </span>
        </div>

        {/* LoginForm Wrapper */}
        <div className="w-full max-w-[440px] mx-auto py-8 relative">
          {/* Sketched Starburst near the form */}
          <div className="absolute -left-12 top-6 opacity-30 pointer-events-none hidden sm:block select-none">
            <svg viewBox="0 0 100 100" className="w-10 h-10 text-[#8e43ac]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M50 15 L50 35 M50 65 L50 85 M15 50 L35 50 M65 50 L85 50 M25 25 L38 38 M62 62 L75 75 M25 75 L38 62 M62 38 L75 25" />
            </svg>
          </div>

          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-[#8e43ac]" />
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Warming up AntBox...</p>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 select-none border-t border-zinc-100 pt-6">
          <span>colony network</span>
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
          <span>people@theantbox.com</span>
        </div>
      </div>

      {/* Right Side: Premium Brand Guidelines Dark Canvas & Mascot Experience */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#12051b] border-l border-purple-950/40 flex-col justify-between p-8 xl:p-12 relative overflow-hidden select-none">
        
        {/* Background Ambient Radial Light & Starry Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(187,98,222,0.12)_1.5px,transparent_1.5px)] [background-size:28px_28px] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-[480px] h-[480px] bg-[#BB62DE]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-[480px] h-[480px] bg-[#561b6e]/30 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Decorative Sketched Accents (Brand Guidelines Page 21) */}
        <div className="absolute top-8 right-10 opacity-20 pointer-events-none">
          <svg viewBox="0 0 100 100" className="w-10 h-10 text-[#eab6ff]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M50 10 C50 35, 35 50, 10 50 C35 50, 50 65, 50 90 C50 65, 65 50, 90 50 C65 50, 50 35, 50 10 Z" />
          </svg>
        </div>

        {/* Top Header / Brand Motto Pill */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 bg-white/[0.06] backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BB62DE] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#BB62DE]" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#eab6ff]">
              Colony Brand Philosophy
            </span>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300/60">
            AntBox HRMS v3.0
          </span>
        </div>

        {/* Center Main Content Container */}
        <div className="w-full max-w-lg mx-auto space-y-6 relative z-10 py-4">
          
          {/* Main Title & Subtitle */}
          <div className="space-y-3 text-center">
            <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-[1.15]">
              When One Wise Ant Leads,<br />
              <span className="bg-gradient-to-r from-white via-[#f6e0ff] to-[#BB62DE] bg-clip-text text-transparent">
                The Whole Colony Grows.
              </span>
            </h1>
            
            <p className="text-xs text-purple-200/80 max-w-md mx-auto leading-relaxed font-medium">
              Teams walk a clear trail — defined by real projects, geofenced telemetry, automated payroll, and instant AI guidance.
            </p>
          </div>

          {/* Interactive 4 Glassmorphism Feature Cards */}
          <div className="grid grid-cols-2 gap-3.5">
            
            {/* Card 1: Collaborative Colony Workspaces */}
            <div className="bg-white/[0.05] backdrop-blur-md border border-white/10 p-3.5 rounded-2xl flex flex-col justify-between hover:bg-white/[0.09] hover:border-[#BB62DE]/50 hover:shadow-[0_8px_24px_-4px_rgba(187,98,222,0.25)] transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#BB62DE]/10 rounded-full blur-xl group-hover:bg-[#BB62DE]/20 transition-all duration-300" />
              <div className="h-24 w-full flex items-center justify-center relative">
                <Image 
                  src="/ants/office-huddle-ants.png" 
                  alt="Colony Workspaces Ant Team" 
                  width={140} 
                  height={90} 
                  className="object-contain max-h-20 transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" 
                  priority
                />
              </div>
              <div className="mt-2 space-y-0.5 relative z-10">
                <p className="text-[11px] font-black text-white group-hover:text-[#eab6ff] transition-colors">Colony Huddles</p>
                <p className="text-[9.5px] text-purple-200/60 leading-tight">Interactive org tree & active team syncs</p>
              </div>
            </div>

            {/* Card 2: AntBox Chachi AI */}
            <div className="bg-white/[0.05] backdrop-blur-md border border-white/10 p-3.5 rounded-2xl flex flex-col justify-between hover:bg-white/[0.09] hover:border-cyan-400/50 hover:shadow-[0_8px_24px_-4px_rgba(6,182,212,0.25)] transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all duration-300" />
              <div className="h-24 w-full flex items-center justify-center relative">
                <Image 
                  src="/ants/ai-gtm-ant-team.png" 
                  alt="AntBox Chachi AI Team" 
                  width={150} 
                  height={80} 
                  className="object-contain max-h-20 transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" 
                  priority
                />
              </div>
              <div className="mt-2 space-y-0.5 relative z-10">
                <p className="text-[11px] font-black text-white group-hover:text-cyan-300 transition-colors">AntBox Chachi AI</p>
                <p className="text-[9.5px] text-purple-200/60 leading-tight">Instant policy answers & smart guidance</p>
              </div>
            </div>

            {/* Card 3: Guided Readiness Trail */}
            <div className="bg-white/[0.05] backdrop-blur-md border border-white/10 p-3.5 rounded-2xl flex flex-col justify-between hover:bg-white/[0.09] hover:border-purple-400/50 hover:shadow-[0_8px_24px_-4px_rgba(147,51,234,0.25)] transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all duration-300" />
              <div className="h-24 w-full flex items-center justify-center relative">
                <Image 
                  src="/ants/leader-learner-ant.png" 
                  alt="Guided Readiness Ant Trail" 
                  width={140} 
                  height={90} 
                  className="object-contain max-h-20 transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" 
                  priority
                />
              </div>
              <div className="mt-2 space-y-0.5 relative z-10">
                <p className="text-[11px] font-black text-white group-hover:text-purple-300 transition-colors">Clear Mentorship</p>
                <p className="text-[9.5px] text-purple-200/60 leading-tight">Onboarding paths & skill readiness</p>
              </div>
            </div>

            {/* Card 4: Sprint Milestones */}
            <div className="bg-white/[0.05] backdrop-blur-md border border-white/10 p-3.5 rounded-2xl flex flex-col justify-between hover:bg-white/[0.09] hover:border-amber-400/50 hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.25)] transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all duration-300" />
              <div className="h-24 w-full flex items-center justify-center relative">
                <Image 
                  src="/ants/running-race-ants.png" 
                  alt="Sprint Milestones Ants" 
                  width={150} 
                  height={80} 
                  className="object-contain max-h-20 transition-transform duration-300 group-hover:scale-105 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" 
                  priority
                />
              </div>
              <div className="mt-2 space-y-0.5 relative z-10">
                <p className="text-[11px] font-black text-white group-hover:text-amber-300 transition-colors">Sprint Telemetry</p>
                <p className="text-[9.5px] text-purple-200/60 leading-tight">Geofenced attendance & daily brew</p>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Banner: Peeking Mascot & Speech Bubble */}
        <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
          <div className="text-[9.5px] font-bold uppercase tracking-widest text-purple-300/50 flex items-center gap-2">
            <span>Bhubaneswar HQ</span>
            <span className="h-1 w-1 rounded-full bg-[#BB62DE]" />
            <span>SaaS HRMS Suite</span>
          </div>

          {/* Peeking Ant Mascot with Speech Bubble */}
          <div className="absolute bottom-0 right-2 flex items-end gap-2 pointer-events-none select-none">
            
            {/* Cute Speech Bubble */}
            <div className="mb-14 bg-white/10 backdrop-blur-xl border border-white/20 px-3 py-1.5 rounded-2xl rounded-br-none shadow-xl transition-transform duration-500 hover:scale-105">
              <p className="text-[10px] font-extrabold text-white tracking-wide flex items-center gap-1.5">
                <span>Welcome to the Colony!</span>
                <span className="animate-bounce">☕</span>
              </p>
            </div>

            {/* Crisp Mascot Ant */}
            <div className="w-24 h-28 relative">
              <Image 
                src="/ants/peeking-ants.png" 
                alt="Peeking Mascot Ant" 
                width={120} 
                height={140} 
                className="object-contain object-bottom filter drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)]" 
                priority
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
