"use client";

import { useEffect, useRef } from "react";

export function WavyGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, tx: -1000, ty: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.tx = e.clientX - rect.left;
      mouseRef.current.ty = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseRef.current.tx = -1000;
      mouseRef.current.ty = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    const GRID_SPACING = 50;

    const render = () => {
      time += 0.5;
      
      // Lerp mouse
      const mouse = mouseRef.current;
      if (mouse.tx === -1000) {
        mouse.x += (-1000 - mouse.x) * 0.1;
        mouse.y += (-1000 - mouse.y) * 0.1;
      } else {
        mouse.x += (mouse.tx - mouse.x) * 0.15;
        mouse.y += (mouse.ty - mouse.y) * 0.15;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      const cols = Math.ceil(w / GRID_SPACING) + 2;
      const rows = Math.ceil(h / GRID_SPACING) + 2;

      // Generate deformed points
      const points: { x: number; y: number }[][] = [];

      for (let c = 0; c < cols; c++) {
        points[c] = [];
        for (let r = 0; r < rows; r++) {
          const origX = (c - 0.5) * GRID_SPACING;
          const origY = (r - 0.5) * GRID_SPACING;

          const dx = origX - mouse.x;
          const dy = origY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let ox = 0;
          let oy = 0;

          // Mouse wave repulsion
          if (dist < 250 && mouse.tx !== -1000) {
            const force = (1 - dist / 250) * 35;
            const angle = Math.atan2(dy, dx);
            ox = Math.cos(angle) * force;
            oy = Math.sin(angle) * force;
          }

          // Gentle ambient wave
          const ambientWave = Math.sin(origX * 0.004 + origY * 0.004 + time * 0.03) * 6;
          ox += ambientWave;
          oy += ambientWave;

          points[c][r] = {
            x: origX + ox,
            y: origY + oy,
          };
        }
      }

      // Draw vertical lines
      ctx.lineWidth = 1.2;
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const p = points[c][r];
          if (r === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            // Draw smooth curve using quadratic curve
            const prev = points[c][r - 1];
            const xc = (p.x + prev.x) / 2;
            const yc = (p.y + prev.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
          }
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.065)";
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
          const p = points[c][r];
          if (c === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            const prev = points[c - 1][r];
            const xc = (p.x + prev.x) / 2;
            const yc = (p.y + prev.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
          }
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.065)";
        ctx.stroke();
      }

      // Draw optional intersection dots with highlight on proximity
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const p = points[c][r];
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150 && mouse.tx !== -1000) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + (1 - dist / 150) * 0.4})`;
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
}
