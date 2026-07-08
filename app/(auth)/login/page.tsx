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

      {/* Right Side: Clean infographic / layout with Canva Brand Mascot assets */}
      <div className="hidden lg:flex lg:w-1/2 bg-[radial-gradient(#e4e4e7_1.5px,transparent_1.5px)] [background-size:24px_24px] bg-zinc-50/70 border-l border-zinc-100 flex-col justify-center items-center p-6 xl:p-10 relative overflow-hidden select-none">
        
        {/* Peeking Ants in the bottom right corner */}
        <div className="absolute bottom-0 right-0 w-24 h-64 pointer-events-none select-none z-20 transition-transform duration-500 hover:translate-x-1 hover:translate-y-1">
          <Image 
            src="/ants/peeking-ants.png" 
            alt="Peeking Ants Mascot" 
            width={96}
            height={256}
            className="object-contain object-bottom object-right"
            priority
          />
        </div>

        {/* Sketched delicate stars and dots in the background */}
        <div className="absolute top-10 left-10 opacity-20 pointer-events-none select-none">
          <svg viewBox="0 0 100 100" className="w-8 h-8 text-[#8e43ac]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M50 15 C50 35, 35 50, 15 50 C35 50, 50 65, 50 85 C50 65, 65 50, 85 50 C65 50, 50 35, 50 15 Z" />
          </svg>
        </div>
        <div className="absolute top-12 right-12 opacity-15 pointer-events-none select-none">
          <svg viewBox="0 0 100 100" className="w-6 h-6 text-[#8e43ac]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M50 20 C50 35, 35 50, 20 50 C35 50, 50 65, 50 80 C50 65, 65 50, 80 50 C65 50, 50 35, 50 20 Z" />
          </svg>
        </div>

        <div className="w-full max-w-xl space-y-6 text-center relative z-10">
          
          <div className="space-y-2 relative">
            <div className="inline-block relative px-4 py-1">
              {/* Hand drawn oval circling the workspace directory label */}
              <div className="absolute inset-0 text-[#8e43ac]/30 w-full h-full pointer-events-none scale-110">
                <svg viewBox="0 0 200 60" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M185 30 C 185 45, 145 55, 100 55 C 55 55, 15 45, 15 30 C 15 15, 55 5, 100 5 C 155 5, 190 20, 180 35" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8e43ac] relative z-10">Workspace Directory</p>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 max-w-md mx-auto leading-tight">
              Bridging Hires to SaaS Careers
            </h1>
            
            {/* Hand-drawn double underline brush effect under the heading */}
            <div className="flex justify-center pt-0.5 opacity-50">
              <svg viewBox="0 0 300 20" className="w-56 h-3 text-[#8e43ac]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 8 C 100 6, 200 10, 285 8" />
                <path d="M45 13 C 120 12, 195 14, 255 12" strokeWidth="1.5" />
              </svg>
            </div>

            <p className="text-xs text-zinc-600 max-w-sm mx-auto leading-relaxed font-semibold pt-1">
              Manage employee onboarding, geofenced attendance, leave policies, and professional payroll runs in a premium flat workspace.
            </p>

            {/* Funky running race ants crossing the screen */}
            <div className="flex justify-center pt-1.5 opacity-85 select-none pointer-events-none">
              <Image 
                src="/ants/running-race-ants.png" 
                alt="Running Race Ants" 
                width={110} 
                height={35} 
                className="object-contain"
                priority
              />
            </div>
          </div>
          
          {/* Polaroid-style bulletin board showcasing the funky ant mascot actions */}
          <div className="grid grid-cols-2 gap-4 items-stretch relative px-4 py-2">
            
            {/* Card 1: Office Sleep */}
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 flex flex-col items-center justify-between relative shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] -rotate-1 hover:rotate-0 hover:scale-[1.03] hover:shadow-md hover:border-purple-500/30 transition-all duration-300 group">
              <div className="absolute -top-3 -right-1 text-[#8e43ac] opacity-50 w-5 h-10 pointer-events-none select-none z-10">
                <svg viewBox="0 0 30 80" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 70 L15 15 C 15 8, 25 8, 25 15 L25 50 C 25 57, 10 57, 10 50 L10 25 C 10 20, 18 20, 18 25 L18 40" />
                </svg>
              </div>
              <div className="flex-1 flex items-center justify-center min-h-[80px]">
                <Image 
                  src="/ants/office-chair-sleep-ant.png" 
                  alt="Deep Work Sleep Ant" 
                  width={68} 
                  height={58} 
                  className="object-contain transition-transform duration-300 group-hover:scale-105" 
                  priority
                />
              </div>
              <div className="mt-3 space-y-0.5 text-center">
                <p className="text-[10px] font-black text-zinc-950 uppercase tracking-wider">Deep Work</p>
                <p className="text-[9px] text-zinc-600 font-bold leading-normal">Optimized developer workspaces</p>
              </div>
            </div>

            {/* Card 2: Coffee Cup */}
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 flex flex-col items-center justify-between relative shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] rotate-1 hover:rotate-0 hover:scale-[1.03] hover:shadow-md hover:border-purple-500/30 transition-all duration-300 group">
              <div className="flex-1 flex items-center justify-center min-h-[80px]">
                <Image 
                  src="/ants/coffee-cup-ant.png" 
                  alt="Daily Energy Coffee Ant" 
                  width={54} 
                  height={58} 
                  className="object-contain transition-transform duration-300 group-hover:scale-105" 
                  priority
                />
              </div>
              <div className="mt-3 space-y-0.5 text-center">
                <p className="text-[10px] font-black text-zinc-950 uppercase tracking-wider">Daily Brew</p>
                <p className="text-[9px] text-zinc-600 font-bold leading-normal">Active syncs & high energy</p>
              </div>
            </div>

            {/* Card 3: Microscope Science */}
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 flex flex-col items-center justify-between relative shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] rotate-1 hover:rotate-0 hover:scale-[1.03] hover:shadow-md hover:border-purple-500/30 transition-all duration-300 group">
              <div className="flex-1 flex items-center justify-center min-h-[80px]">
                <Image 
                  src="/ants/microscope-science-ant.png" 
                  alt="Precision Science Ant" 
                  width={58} 
                  height={58} 
                  className="object-contain transition-transform duration-300 group-hover:scale-105" 
                  priority
                />
              </div>
              <div className="mt-3 space-y-0.5 text-center">
                <p className="text-[10px] font-black text-zinc-950 uppercase tracking-wider">Precision Analytics</p>
                <p className="text-[9px] text-zinc-600 font-bold leading-normal">Geofenced timesheets & telemetry</p>
              </div>
            </div>

            {/* Card 4: Blueprint Planning */}
            <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 flex flex-col items-center justify-between relative shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] -rotate-1 hover:rotate-0 hover:scale-[1.03] hover:shadow-md hover:border-purple-500/30 transition-all duration-300 group">
              <div className="absolute -top-3 -right-1 text-[#8e43ac] opacity-50 w-5 h-10 pointer-events-none select-none z-10">
                <svg viewBox="0 0 30 80" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 70 L15 15 C 15 8, 25 8, 25 15 L25 50 C 25 57, 10 57, 10 50 L10 25 C 10 20, 18 20, 18 25 L18 40" />
                </svg>
              </div>
              <div className="flex-1 flex items-center justify-center min-h-[80px]">
                <Image 
                  src="/ants/blueprints-walking-ant.png" 
                  alt="Sprint Blueprints Ant" 
                  width={64} 
                  height={58} 
                  className="object-contain transition-transform duration-300 group-hover:scale-105" 
                  priority
                />
              </div>
              <div className="mt-3 space-y-0.5 text-center">
                <p className="text-[10px] font-black text-zinc-950 uppercase tracking-wider">Goal Execution</p>
                <p className="text-[9px] text-zinc-600 font-bold leading-normal">Sprint reports & milestones</p>
              </div>
            </div>

          </div>

          {/* Location / Tech tag */}
          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest select-none flex items-center justify-center gap-3 pt-1">
            <span>Bhubaneswar HQ</span>
            <span className="h-1 w-1 rounded-full bg-zinc-300" />
            <span>SaaS HRMS Suite</span>
          </div>
        </div>
      </div>
    </div>
  );
}
