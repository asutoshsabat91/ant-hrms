"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export function ScrollIndicator() {
  const [visible, setVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-width");
    if (saved) {
      setSidebarWidth(parseInt(saved, 10));
    }

    const handleScroll = () => {
      if (window.scrollY > 80) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    };

    const interval = setInterval(() => {
      const savedWidth = localStorage.getItem("sidebar-width");
      if (savedWidth) {
        const val = parseInt(savedWidth, 10);
        if (val !== sidebarWidth) setSidebarWidth(val);
      }
    }, 500);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, [sidebarWidth]);

  if (!visible) return null;

  return (
    <div 
      style={{ left: `calc(50% + ${sidebarWidth / 2}px)` }}
      className="fixed bottom-6 z-30 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer pointer-events-none select-none animate-bounce"
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-white/80 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm border border-zinc-200/50">
        Explore Dashboard
      </span>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-800 shadow-md border border-zinc-200/60">
        <ChevronDown className="h-4 w-4 animate-pulse text-[var(--purple)]" />
      </div>
    </div>
  );
}
