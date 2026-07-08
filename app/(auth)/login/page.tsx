import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100/80 p-4 md:p-8 font-sans selection:bg-amber-100 selection:text-zinc-900 relative light-theme-forced">
      
      {/* Centered Premium Dribbble Card */}
      <div className="flex w-full max-w-5xl rounded-[32px] bg-white shadow-2xl overflow-hidden min-h-[640px] border border-zinc-200/50 flex-col md:flex-row relative z-10 light-theme-forced">
        
        {/* Left Side: Form Panel */}
        <div className="w-full md:w-1/2 flex flex-col justify-between p-8 md:p-12 bg-gradient-to-b from-[#fdfcf7] via-[#faf5e5] to-[#f4edd2] relative min-h-[580px]">
          
          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-zinc-200/80 bg-white/70 backdrop-blur-sm shadow-sm">
              <Image src="/logo.png" alt="AntBox Logo" width={80} height={24} className="object-contain" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 select-none bg-white border border-zinc-200/60 px-2.5 py-1 rounded-full">
              v3.0.0
            </span>
          </div>

          {/* Form Content Area */}
          <div className="w-full max-w-[360px] mx-auto py-6">
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-amber-500" />
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Warming up AntBox...</p>
              </div>
            }>
              <LoginForm />
            </Suspense>
          </div>

          {/* Footer info */}
          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-400 select-none border-t border-zinc-200/40 pt-4">
            <span>colony network</span>
            <span>people@theantbox.com</span>
          </div>
        </div>

        {/* Right Side: Professional Stock Photo & Transparent Overlay Widgets */}
        <div className="hidden md:block md:w-1/2 relative bg-zinc-900 overflow-hidden">
          <Image 
            src="/team_collaboration_banner.png" 
            alt="Antbox team collaborating" 
            fill 
            className="object-cover"
            priority
          />
          {/* Overlay Gradient to dim slightly for widgets */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/30 pointer-events-none" />

          {/* Close Button top right */}
          <div className="absolute top-6 right-6 h-8 w-8 rounded-full bg-white/80 hover:bg-white backdrop-blur-md border border-white/20 flex items-center justify-center text-zinc-700 cursor-pointer shadow-md transition-all">
            <span className="text-xs font-bold font-mono">✕</span>
          </div>

          {/* Floating Widget 1: Task Review With Team */}
          <div className="absolute top-6 left-6 bg-[#fcd34d] text-zinc-950 px-4 py-3 rounded-2xl shadow-lg border border-yellow-400/40 max-w-[200px] animate-float">
            <p className="text-[10px] uppercase tracking-wider text-zinc-800 font-extrabold">Task Review With Team</p>
            <p className="text-zinc-950 mt-1 font-mono text-[10px] font-black">09:30am - 10:00am</p>
          </div>

          {/* Floating Widget 2: Calendar Stripe */}
          <div className="absolute bottom-36 left-6 right-6 bg-white/70 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-white/20 flex justify-between items-center text-[10px] font-bold text-zinc-800">
            {[
              { day: "Sun", date: "22" },
              { day: "Mon", date: "23" },
              { day: "Tue", date: "24" },
              { day: "Wed", date: "25" },
              { day: "Thu", date: "26" },
              { day: "Fri", date: "27" },
              { day: "Sat", date: "28" }
            ].map((item, i) => (
              <div key={item.date} className={`flex flex-col items-center p-1.5 rounded-xl transition-all ${i === 3 ? "bg-amber-400 text-zinc-950 px-3 shadow-md border border-amber-500/20 scale-105" : "text-zinc-700"}`}>
                <span className="text-[8px] opacity-75 font-bold">{item.day}</span>
                <span className="text-xs font-black font-mono mt-0.5">{item.date}</span>
              </div>
            ))}
          </div>

          {/* Floating Widget 3: Daily Meeting */}
          <div className="absolute bottom-6 left-6 bg-white/80 backdrop-blur-md px-5 py-4 rounded-2xl shadow-lg border border-white/30 max-w-[240px]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-extrabold uppercase text-zinc-900 tracking-wider">Daily Meeting</p>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[9px] text-zinc-500 font-bold font-mono">12:00pm - 01:00pm</p>
            <div className="flex items-center -space-x-2 mt-3">
              <div className="h-6 w-6 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm">AL</div>
              <div className="h-6 w-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm">OD</div>
              <div className="h-6 w-6 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm">EL</div>
              <div className="h-6 w-6 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-zinc-600 shadow-sm">+4</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
