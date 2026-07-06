"use client";

import { useState, useEffect, useRef } from "react";

export function ResizableLayout({
  sidebar,
  topbar,
  children,
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [width, setWidth] = useState(256);
  const isDragging = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= 180 && parsed <= 480) {
        setWidth(parsed);
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.max(180, Math.min(480, e.clientX));
      setWidth(newWidth);
      localStorage.setItem("sidebar-width", newWidth.toString());
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[var(--background)] overflow-x-hidden">
      {/* Interactive Mesh Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[1000px] h-[1000px] rounded-full bg-gradient-to-bl from-[var(--purple-mid)] via-[var(--purple-light)] to-transparent blur-3xl opacity-60 animate-slow-spin mix-blend-multiply" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-[var(--brand-accent)] via-[var(--purple-light)] to-transparent blur-3xl opacity-40 animate-slow-spin-reverse mix-blend-multiply" />
        {/* Cyber Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_10%,transparent_100%)]" />
      </div>

      {/* Sidebar container with dynamic width */}
      <div 
        className="fixed left-0 top-0 z-40 h-screen border-r border-[var(--border)] bg-[var(--sidebar-bg)] select-none"
        style={{ width: `${width}px` }}
      >
        {sidebar}
        
        {/* Resizer bar */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 right-0 h-full w-[4px] cursor-col-resize hover:bg-[var(--purple)]/40 active:bg-[var(--purple)] transition-colors z-50 group"
          title="Drag to resize sidebar"
        >
          {/* Subtle indicator line */}
          <div className="absolute right-0 top-0 h-full w-[1px] bg-black/10 group-hover:bg-[var(--purple)]/50" />
        </div>
      </div>

      {/* Main Content & Topbar container */}
      <div 
        className="flex flex-col min-h-screen"
        style={{ marginLeft: `${width}px` }}
      >
        <div 
          className="fixed right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border)] bg-white/80 backdrop-blur-md px-6"
          style={{ left: `${width}px` }}
        >
          {topbar}
        </div>
        <main className="mt-16 min-h-[calc(100vh-4rem)] p-8 relative z-10">{children}</main>
      </div>
    </div>
  );
}
