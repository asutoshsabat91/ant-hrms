import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { ShieldCheck, Zap } from "lucide-react";
import { AccordionApp } from "@/components/watermelon/card-split-accordian";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#030303] text-zinc-300 font-sans selection:bg-[#BB62DE]/30 selection:text-white flex flex-col items-center justify-center overflow-hidden">
      
      {/* Impeccable Background: Soft grid + ambient glows */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#BB62DE]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#9448b2]/10 blur-[100px] rounded-full pointer-events-none" />
      </div>

      {/* Top Navigation */}
      <nav className="absolute top-0 left-0 w-full p-6 sm:p-8 flex items-center justify-between z-20">
        <Image src="/logo.png" alt="AntBox Logo" width={110} height={32} className="object-contain brightness-0 invert opacity-90" priority />
        <div className="hidden sm:flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] px-3 py-1.5 rounded-full backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BB62DE] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#BB62DE]" />
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-zinc-300 uppercase">All systems operational</span>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="relative z-10 flex flex-col items-center w-full max-w-5xl px-6 pt-24 pb-16">
        
        {/* Header Section */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-4 text-xs font-medium rounded-full bg-white/[0.03] border border-white/[0.05] text-zinc-300 backdrop-blur-sm">
            ✨ Introducing AntBox HRMS 2.0
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white mb-4">
            The intelligent <span className="text-[#eab6ff] italic pr-2">people</span> platform.
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto font-light leading-relaxed">
            Manage your entire workforce from a single, unified ecosystem. Telemetry, payroll, and onboarding—streamlined.
          </p>
        </div>

        {/* Login Card (Floating Glass) */}
        <div className="w-full max-w-[400px] bg-white/[0.02] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#BB62DE]/40 to-transparent" />
          
          <div className="mb-8 text-center">
            <h2 className="text-xl font-semibold text-white tracking-tight">Sign in to your workspace</h2>
          </div>

          <Suspense fallback={
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-800 border-t-[#BB62DE]" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>

        {/* Secondary Features (Watermelon Accordion) */}
        <div className="w-full max-w-2xl mt-24 opacity-80 hover:opacity-100 transition-opacity duration-500">
          <h3 className="text-sm font-medium text-zinc-500 text-center mb-6 uppercase tracking-widest">Platform Capabilities</h3>
          <AccordionApp items={[
            { id: 1, title: 'Smart Onboarding', icon: <Zap className="size-4" />, content: 'Digital document signing and seamless induction paths for all new hires.' },
            { id: 2, title: 'Geofenced Attendance', icon: <ShieldCheck className="size-4" />, content: 'Secure and accurate time tracking via GPS fences at your branch locations.' }
          ]} />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="absolute bottom-6 w-full text-center z-10">
        <p className="text-[11px] font-medium tracking-wide text-zinc-600 uppercase">© {new Date().getFullYear()} Colony Network</p>
      </footer>
    </div>
  );
}
