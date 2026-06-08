"use client";

import { useEffect, useRef } from "react";

export function RippleDots() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let startTime = Date.now();
    let isActive = false; // Start inactive, let observer trigger it

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = parent.clientWidth * dpr;
        canvas.height = parent.clientHeight * dpr;
        // Reset transform before scaling to avoid accumulating scale
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
    };

    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      if (!isActive || !ctx || !canvas) return;
      
      const parent = canvas.parentElement;
      if (!parent) return;
      
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      ctx.clearRect(0, 0, width, height);

      const time = (Date.now() - startTime) / 1000;
      const spacing = 16; // Match the 16px grid
      const cols = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);
      
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.fillStyle = "#000000";

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * spacing;
          const y = j * spacing;

          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Wave function: sine wave based on distance and time
          // Increased speed to time * 4.0 and tighter wavelength
          const wave = Math.sin(dist / 30 - time * 4.0);
          
          // Normalize wave to 0..1
          const normalizedWave = (wave + 1) / 2;
          
          // Base opacity 0.05, ripples up to 0.40 for high visibility
          const opacity = 0.05 + normalizedWave * 0.35;
          
          // Base size 1.0px, ripples up to 4.0px
          const size = 1.0 + normalizedWave * 3.0;

          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (isActive) {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!isActive) {
            isActive = true;
            draw();
          }
        } else {
          isActive = false;
        }
      });
    }, { threshold: 0.01 });

    observer.observe(canvas);

    return () => {
      isActive = false;
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
