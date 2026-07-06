import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-white font-sans selection:bg-[#d882ff]/20 selection:text-[#8e43ac]">
      {/* Left Side: Brand Logo, Welcome Text & Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 md:p-16 bg-white min-h-screen">
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
        <div className="w-full max-w-[440px] mx-auto py-8">
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
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-50 border-l border-zinc-100 flex-col justify-center items-center p-16 relative overflow-hidden select-none">
        <div className="w-full max-w-lg space-y-12 text-center">
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8e43ac] font-sans">Workspace Directory</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950">Bridging Hires to SaaS Careers</h1>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed font-medium">
              Manage employee onboarding, geofenced attendance, leave policies, and professional payroll runs in a premium flat workspace.
            </p>
          </div>
          
          {/* Static Infographic of Canva mascots */}
          <div className="grid grid-cols-2 gap-6 items-stretch">
            {/* Mascot 1 Card */}
            <div className="bg-white p-8 rounded-2xl border border-zinc-200/60 flex flex-col items-center justify-between">
              <div className="flex-1 flex items-center justify-center">
                <Image 
                  src="/pitstop-ants.png" 
                  alt="Colony Collaboration Mascot" 
                  width={150} 
                  height={110} 
                  className="object-contain" 
                  priority
                />
              </div>
              <div className="mt-6 space-y-1 text-center">
                <p className="text-[10px] font-bold text-zinc-900 uppercase tracking-wider">Pitstop Collaboration</p>
                <p className="text-[9px] text-zinc-400 font-medium leading-relaxed">Efficient HR checklists and offboarding exit flows</p>
              </div>
            </div>

            {/* Mascot 2 Card */}
            <div className="bg-white p-8 rounded-2xl border border-zinc-200/60 flex flex-col items-center justify-between">
              <div className="flex-1 flex items-center justify-center">
                <Image 
                  src="/basketball-ant.png" 
                  alt="Goal Execution Mascot" 
                  width={130} 
                  height={110} 
                  className="object-contain" 
                  priority
                />
              </div>
              <div className="mt-6 space-y-1 text-center">
                <p className="text-[10px] font-bold text-zinc-900 uppercase tracking-wider">Goal Execution</p>
                <p className="text-[9px] text-zinc-400 font-medium leading-relaxed">Track progress limits and quarterly team success</p>
              </div>
            </div>
          </div>

          {/* Location / Tech tag */}
          <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest select-none flex items-center justify-center gap-3">
            <span>Bhubaneswar HQ</span>
            <span className="h-1 w-1 rounded-full bg-zinc-300" />
            <span>SaaS HRMS Suite</span>
          </div>
        </div>
      </div>
    </div>
  );
}
