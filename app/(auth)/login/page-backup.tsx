import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";

const ANTS_CONFIG = [
  { id: 1, type: "leaf", top: "5%", duration: "22s", delay: "-4s", anim: "march-horizontal", direction: "ltr" },
  { id: 2, type: "coin", top: "12%", duration: "26s", delay: "-12s", anim: "march-horizontal-rev", direction: "rtl" },
  { id: 3, type: "coffee", top: "20%", duration: "24s", delay: "-8s", anim: "march-diagonal-down", direction: "ltr" },
  { id: 4, type: "leaf", top: "28%", duration: "29s", delay: "-17s", anim: "march-diagonal-down-rev", direction: "rtl" },
  { id: 5, type: "coin", top: "36%", duration: "25s", delay: "-5s", anim: "march-diagonal-up", direction: "ltr" },
  { id: 6, type: "coffee", top: "44%", duration: "32s", delay: "-22s", anim: "march-diagonal-up-rev", direction: "rtl" },
  { id: 7, type: "leaf", top: "52%", duration: "28s", delay: "-10s", anim: "march-horizontal", direction: "ltr" },
  { id: 8, type: "coin", top: "60%", duration: "23s", delay: "-19s", anim: "march-horizontal-rev", direction: "rtl" },
  { id: 9, type: "coffee", top: "68%", duration: "31s", delay: "-3s", anim: "march-diagonal-down", direction: "ltr" },
  { id: 10, type: "leaf", top: "76%", duration: "27s", delay: "-15s", anim: "march-diagonal-down-rev", direction: "rtl" },
  { id: 11, type: "coin", top: "84%", duration: "22s", delay: "-6s", anim: "march-diagonal-up", direction: "ltr" },
  { id: 12, type: "coffee", top: "92%", duration: "33s", delay: "-25s", anim: "march-diagonal-up-rev", direction: "rtl" },
  { id: 13, type: "leaf", top: "16%", duration: "20s", delay: "-14s", anim: "march-horizontal", direction: "ltr" },
  { id: 14, type: "coin", top: "32%", duration: "27s", delay: "-7s", anim: "march-horizontal-rev", direction: "rtl" },
  { id: 15, type: "coffee", top: "48%", duration: "23s", delay: "-18s", anim: "march-diagonal-down", direction: "ltr" },
  { id: 16, type: "leaf", top: "64%", duration: "30s", delay: "-9s", anim: "march-diagonal-down-rev", direction: "rtl" },
  { id: 17, type: "coin", top: "80%", duration: "25s", delay: "-21s", anim: "march-diagonal-up", direction: "ltr" },
  { id: 18, type: "coffee", top: "88%", duration: "31s", delay: "-11s", anim: "march-diagonal-up-rev", direction: "rtl" },
];

const LEAVES_CONFIG = [
  { id: 1, left: "8%", delay: "-3s", duration: "11s", size: "18px" },
  { id: 2, left: "22%", delay: "-7s", duration: "15s", size: "24px" },
  { id: 3, left: "38%", delay: "-1s", duration: "13s", size: "20px" },
  { id: 4, left: "50%", delay: "-10s", duration: "17s", size: "22px" },
  { id: 5, left: "68%", delay: "-2s", duration: "14s", size: "26px" },
  { id: 6, left: "82%", delay: "-5s", duration: "12s", size: "19px" },
  { id: 7, left: "94%", delay: "-8s", duration: "16s", size: "23px" },
  { id: 8, left: "15%", delay: "-12s", duration: "14s", size: "21px" },
  { id: 9, left: "30%", delay: "-4s", duration: "12s", size: "25px" },
  { id: 10, left: "60%", delay: "-9s", duration: "15s", size: "17px" },
];

const TRACK_FRACTIONS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

function getTrackDelay(antDelay: string, antDuration: string, fraction: number, direction: string) {
  const d = parseFloat(antDelay);
  const dur = parseFloat(antDuration);
  const factor = direction === "ltr" ? fraction : (1 - fraction);
  return `${d + dur * factor}s`;
}

function AntSvg({ type }: { type: string }) {
  if (type === "leaf") {
    return (
      <svg viewBox="0 0 100 60" className="w-full h-auto overflow-visible">
        {/* Carrying Item: Green Leaf */}
        <path d="M 45,5 C 55,-5 70,5 65,15 C 60,20 40,15 45,5 Z" fill="#10b981" className="ant-carrying" filter="drop-shadow(0 2px 4px rgba(16,185,129,0.4))" />
        {/* Legs */}
        <path d="M 35,25 Q 25,40 20,42 M 45,25 Q 35,42 33,43 M 55,25 Q 45,43 42,43" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" className="ant-leg-l" />
        <path d="M 35,25 Q 45,40 50,42 M 45,25 Q 55,42 57,43 M 55,25 Q 65,43 68,43" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" className="ant-leg-r" />
        {/* Head & Antennae */}
        <path d="M 68,23 C 65,18 60,18 58,23 C 58,25 68,25 68,23 Z" fill="#c084fc" />
        <path d="M 64,20 Q 68,10 74,8 M 62,20 Q 64,8 68,6" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Eyes */}
        <circle cx="64" cy="21" r="1.5" fill="#000" />
        {/* Body Segments */}
        <circle cx="50" cy="25" r="7" fill="#a855f7" />
        <ellipse cx="32" cy="27" rx="10" ry="7" fill="#7c3aed" />
      </svg>
    );
  }
  if (type === "coin") {
    return (
      <svg viewBox="0 0 100 60" className="w-full h-auto overflow-visible">
        {/* Carrying Item: Gold Coin */}
        <circle cx="50" cy="8" r="7" fill="#f97316" className="ant-carrying" filter="drop-shadow(0 2px 4px rgba(249,115,22,0.5))" />
        <text x="50" y="11" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle" className="ant-carrying">$</text>
        {/* Legs */}
        <path d="M 35,25 Q 25,40 20,42 M 45,25 Q 35,42 33,43 M 55,25 Q 45,43 42,43" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" className="ant-leg-l" />
        <path d="M 35,25 Q 45,40 50,42 M 45,25 Q 55,42 57,43 M 55,25 Q 65,43 68,43" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" className="ant-leg-r" />
        {/* Head & Antennae */}
        <path d="M 68,23 C 65,18 60,18 58,23 C 58,25 68,25 68,23 Z" fill="#c084fc" />
        <path d="M 64,20 Q 68,10 74,8 M 62,20 Q 64,8 68,6" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Eyes */}
        <circle cx="64" cy="21" r="1.5" fill="#000" />
        {/* Body Segments */}
        <circle cx="50" cy="25" r="7" fill="#a855f7" />
        <ellipse cx="32" cy="27" rx="10" ry="7" fill="#7c3aed" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 60" className="w-full h-auto overflow-visible">
      {/* Carrying Item: Neon Coffee Cup */}
      <path d="M 42,4 L 58,4 L 56,14 L 44,14 Z" fill="#3b82f6" className="ant-carrying" filter="drop-shadow(0 2px 4px rgba(59,130,246,0.5))" />
      <path d="M 56,6 C 60,6 61,10 56,11" stroke="#3b82f6" strokeWidth="1.5" fill="none" className="ant-carrying" />
      {/* Legs */}
      <path d="M 35,25 Q 25,40 20,42 M 45,25 Q 35,42 33,43 M 55,25 Q 45,43 42,43" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" className="ant-leg-l" />
      <path d="M 35,25 Q 45,40 50,42 M 45,25 Q 55,42 57,43 M 55,25 Q 65,43 68,43" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" className="ant-leg-r" />
      {/* Head & Antennae */}
      <path d="M 68,23 C 65,18 60,18 58,23 C 58,25 68,25 68,23 Z" fill="#c084fc" />
      <path d="M 64,20 Q 68,10 74,8 M 62,20 Q 64,8 68,6" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <circle cx="64" cy="21" r="1.5" fill="#000" />
      {/* Body Segments */}
      <circle cx="50" cy="25" r="7" fill="#a855f7" />
      <ellipse cx="32" cy="27" rx="10" ry="7" fill="#7c3aed" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] font-sans selection:bg-[#c084fc] selection:text-black">
      {/* Dynamic Animated Background Mesh */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[80%] rounded-full bg-radial-gradient from-[rgba(168,85,247,0.15)] to-transparent blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute -bottom-[40%] -right-[20%] h-[80%] w-[80%] rounded-full bg-radial-gradient from-[rgba(249,115,22,0.12)] to-transparent blur-[120px] animate-pulse" style={{ animationDuration: "12s" }} />
      </div>

      {/* Cyber Grid Lines */}
      <div className="absolute inset-0 z-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Embedded CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes march-horizontal {
          0% { transform: translateX(-150px); }
          100% { transform: translateX(calc(100vw + 150px)); }
        }
        @keyframes march-horizontal-rev {
          0% { transform: translateX(calc(100vw + 150px)) scaleX(-1); }
          100% { transform: translateX(-150px) scaleX(-1); }
        }
        @keyframes march-diagonal-down {
          0% { transform: translate(-150px, -50px) rotate(15deg); }
          100% { transform: translate(calc(100vw + 150px), calc(40vh + 50px)) rotate(15deg); }
        }
        @keyframes march-diagonal-down-rev {
          0% { transform: translate(calc(100vw + 150px), -50px) scaleX(-1) rotate(-15deg); }
          100% { transform: translate(-150px, calc(40vh + 50px)) scaleX(-1) rotate(-15deg); }
        }
        @keyframes march-diagonal-up {
          0% { transform: translate(-150px, 30vh) rotate(-10deg); }
          100% { transform: translate(calc(100vw + 150px), 10vh) rotate(-10deg); }
        }
        @keyframes march-diagonal-up-rev {
          0% { transform: translate(calc(100vw + 150px), 30vh) scaleX(-1) rotate(10deg); }
          100% { transform: translate(-150px, 10vh) scaleX(-1) rotate(10deg); }
        }
        @keyframes leg-wiggle-left {
          0% { transform: rotate(-5deg); }
          100% { transform: rotate(5deg); }
        }
        @keyframes leg-wiggle-right {
          0% { transform: rotate(5deg); }
          100% { transform: rotate(-5deg); }
        }
        @keyframes float-box {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(3deg); }
        }
        @keyframes leaf-fall {
          0% { transform: translateY(-50px) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.12; }
          90% { opacity: 0.12; }
          100% { transform: translateY(105vh) translateX(120px) rotate(360deg); opacity: 0; }
        }
        @keyframes footprint-pulse {
          0% { opacity: 0; transform: scale(0.6); }
          0.5% { opacity: 0.45; transform: scale(1); }
          4% { opacity: 0.15; transform: scale(0.8); }
          8% { opacity: 0; transform: scale(0.6); }
          100% { opacity: 0; }
        }
        .ant-leg-l {
          transform-origin: 20px 25px;
          animation: leg-wiggle-left 0.15s infinite alternate ease-in-out;
        }
        .ant-leg-r {
          transform-origin: 20px 25px;
          animation: leg-wiggle-right 0.15s infinite alternate ease-in-out;
        }
        .ant-carrying {
          animation: float-box 1.5s infinite ease-in-out;
        }
        .leaf-particle {
          animation: leaf-fall linear infinite;
        }
        .footprint-dot {
          animation: footprint-pulse infinite linear;
        }
      `}} />

      {/* Falling Leaves Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {LEAVES_CONFIG.map((leaf) => (
          <div
            key={leaf.id}
            className="absolute leaf-particle"
            style={{
              left: leaf.left,
              top: "-40px",
              width: leaf.size,
              height: leaf.size,
              animationDelay: leaf.delay,
              animationDuration: leaf.duration,
            }}
          >
            <svg viewBox="0 0 24 24" className="w-full h-full fill-emerald-500/15">
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34L21.34,3.82C16.17,5.9 10,8 17,8Z" />
            </svg>
          </div>
        ))}
      </div>

      {/* Dotted Footprints (Ant Trails) Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {ANTS_CONFIG.map((ant) => {
          const isDiagonal = ant.anim.includes("diagonal");
          return TRACK_FRACTIONS.map((frac) => {
            const delay = getTrackDelay(ant.delay, ant.duration, frac, ant.direction);
            let offsetTop = parseFloat(ant.top);
            if (isDiagonal) {
              const isDown = ant.anim.includes("down");
              const slope = isDown ? 15 : -15;
              offsetTop = offsetTop + (frac - 0.5) * slope;
            }
            return (
              <div
                key={`${ant.id}-${frac}`}
                className="absolute flex flex-col gap-[3px]"
                style={{
                  top: `${offsetTop}%`,
                  left: `${frac * 100}%`,
                }}
              >
                <div
                  className="w-[3px] h-[3px] rounded-full bg-purple-400/40 footprint-dot"
                  style={{
                    animationDuration: ant.duration,
                    animationDelay: delay,
                  }}
                />
                <div
                  className="w-[3px] h-[3px] rounded-full bg-purple-400/40 footprint-dot ml-[2px]"
                  style={{
                    animationDuration: ant.duration,
                    animationDelay: `${parseFloat(delay) + 0.1}s`,
                  }}
                />
              </div>
            );
          });
        })}
      </div>

      {/* Cartoon Walking Ants Colony Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {ANTS_CONFIG.map((ant) => (
          <div
            key={ant.id}
            className="absolute"
            style={{
              top: ant.top,
              width: "75px",
              animation: `${ant.anim} ${ant.duration} infinite linear`,
              animationDelay: ant.delay,
            }}
          >
            <AntSvg type={ant.type} />
          </div>
        ))}
      </div>

      {/* Split Layout Container */}
      <div className="relative z-10 flex min-h-screen w-full flex-col lg:flex-row">
        {/* Left Side Hero Panel (Hidden on mobile for focus, visible on desktop) */}
        <div className="hidden w-1/2 flex-col justify-between p-16 text-white lg:flex lg:w-[45%]">
          <div>
            {/* Brand Logo with Funky Drop Shadow */}
            <div className="mb-10 inline-flex items-center justify-center rounded-2xl bg-[#121214] p-4 shadow-[0_0_30px_rgba(168,85,247,0.3)] border border-[#27272a] hover:scale-105 transition-transform duration-300">
              <Image src="/logo.png" alt="AntBox Logo" width={120} height={35} className="object-contain filter invert brightness-200" />
            </div>
            <h1 className="text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Welcome to <span className="bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">AntHRMS</span>
            </h1>
            <p className="mt-6 max-w-sm text-sm font-medium leading-relaxed text-zinc-400">
              A GenZ-first workspace bridging academia to SaaS careers. Manage onboarding, attendance, leaves, and payroll in an ultra-modern environment.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <span>Bhubaneswar HQ</span>
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            <span>people@theantbox.com</span>
          </div>
        </div>

        {/* Right Side Glassmorphic Card Container */}
        <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-[55%] lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-[480px]">
            {/* Floating Glassmorphic Login Box */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-10">
              {/* Outer Decorative Neon Ring */}
              <div className="absolute -top-12 -left-12 h-24 w-24 rounded-full bg-purple-500/10 blur-xl" />
              <div className="absolute -bottom-12 -right-12 h-24 w-24 rounded-full bg-orange-500/10 blur-xl" />

              <div className="relative z-10">
                {/* Logo for mobile view */}
                <div className="mb-6 flex justify-center lg:hidden">
                  <div className="inline-flex items-center justify-center rounded-xl bg-[#121214] p-3 border border-[#27272a]">
                    <Image src="/logo.png" alt="AntBox Logo" width={90} height={26} className="object-contain filter invert brightness-200" />
                  </div>
                </div>

                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                    <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Tuning AntBox Antennas...</p>
                  </div>
                }>
                  <LoginForm />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
