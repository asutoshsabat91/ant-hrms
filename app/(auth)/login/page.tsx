import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { ShieldCheck, Zap } from "lucide-react";
import { AccordionApp } from "@/components/watermelon/card-split-accordian";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-[#0a0210] text-zinc-300 font-sans selection:bg-[#BB62DE]/30 selection:text-white relative overflow-hidden">
      
      {/* Background Ambient Mesh Gradients for deep spatial aesthetic */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-gradient-to-br from-[#BB62DE]/15 via-[#9448b2]/5 to-transparent rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-gradient-to-tl from-[#eab6ff]/10 via-[#7c3aed]/5 to-transparent rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] bg-[#BB62DE]/5 rounded-full blur-[100px]" />
        
        {/* Subtle starry noise overlay for premium texture */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Left Side: Brand Story & Interactive Features */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 xl:p-24 relative z-10 border-r border-white/[0.05]">
        
        {/* Brand Logo Header */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center justify-start drop-shadow-2xl">
            {/* If a white logo exists, use it, otherwise apply CSS filters for dark mode */}
            <Image src="/logo.png" alt="AntBox Logo" width={140} height={40} className="object-contain brightness-0 invert" priority />
          </div>
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 rounded-full backdrop-blur-md shadow-2xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BB62DE] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#BB62DE]" />
            </span>
            <span className="text-[10px] font-bold tracking-widest text-[#eab6ff] uppercase">System Operational</span>
          </div>
        </div>

        {/* Hero Value Proposition */}
        <div className="w-full max-w-xl space-y-8 py-12 relative">
          
          <div className="space-y-4">
            <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Elevate your <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#eab6ff] via-[#BB62DE] to-[#9448b2] animate-text">
                workforce potential.
              </span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-md leading-relaxed font-light">
              Experience the future of human resources. Seamlessly manage payroll, onboarding, telemetry, and talent growth in one unified, intelligent ecosystem.
            </p>
          </div>

          {/* Premium Glassmorphic Feature Cards */}
          <div className="grid grid-cols-2 gap-5 pt-6">
            <div className="group bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl backdrop-blur-xl hover:bg-white/[0.04] hover:border-[#BB62DE]/30 transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(187,98,222,0.2)]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#BB62DE]/20 to-transparent flex items-center justify-center text-[#eab6ff] mb-4 group-hover:scale-110 transition-transform duration-500 border border-[#BB62DE]/20">
                <ShieldCheck size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-[#eab6ff] transition-colors">Bank-Grade Security</h3>
              <p className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">Enterprise-level data protection and secure role-based access controls for your organization.</p>
            </div>

            <div className="group bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl backdrop-blur-xl hover:bg-white/[0.04] hover:border-[#BB62DE]/30 transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(187,98,222,0.2)] translate-y-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#BB62DE]/20 to-transparent flex items-center justify-center text-[#eab6ff] mb-4 group-hover:scale-110 transition-transform duration-500 border border-[#BB62DE]/20">
                <Zap size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-[#eab6ff] transition-colors">Instant Telemetry</h3>
              <p className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">Real-time attendance tracking, geofenced clock-ins, and dynamic payroll integration.</p>
            </div>
          </div>

          <div className="pt-6">
            <AccordionApp items={[
              { id: 1, title: 'Smart Onboarding', icon: <Zap className="size-4" />, content: 'Digital document signing and seamless induction paths for all new hires.' },
              { id: 2, title: 'Geofenced Attendance', icon: <ShieldCheck className="size-4" />, content: 'Secure and accurate time tracking via GPS fences at your branch locations.' }
            ]} />
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs font-medium tracking-wide text-zinc-600">
          <span>© {new Date().getFullYear()} Colony Network</span>
          <a href="#" className="hover:text-[#BB62DE] transition-colors flex items-center gap-1">
            Discover more <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {/* Right Side: Login Panel */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center items-center p-6 sm:p-12 relative z-10">
        
        {/* Mobile Header (Visible only on small screens) */}
        <div className="lg:hidden w-full flex items-center justify-between mb-12">
          <Image src="/logo.png" alt="AntBox Logo" width={110} height={32} className="object-contain brightness-0 invert" priority />
        </div>

        {/* Premium White Login Container for high contrast */}
        <div className="w-full max-w-[420px] mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden">
          
          {/* Subtle Top Glow for depth */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-[#BB62DE] to-transparent" />
          
          <div className="mb-8 text-center space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Welcome Back</h2>
            <p className="text-sm text-zinc-500">Enter your credentials to access your workspace</p>
          </div>

          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-16 space-y-5">
              <div className="h-8 w-8 animate-spin rounded-full border-[2px] border-zinc-800 border-t-[#BB62DE]" />
              <p className="text-xs text-zinc-500 font-medium tracking-widest uppercase">Connecting securely...</p>
            </div>
          }>
            <LoginForm />
          </Suspense>
          
        </div>
      </div>
    </div>
  );
}
