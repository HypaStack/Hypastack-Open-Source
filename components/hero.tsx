"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MIcon } from "@/components/ui/material-icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Hero() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [pendingNav, setPendingNav] = useState(false);

  // Navigate once auth resolves after button was clicked
  useEffect(() => {
    if (pendingNav && !isLoading) {
      setPendingNav(false);
      router.push(isAuthenticated ? "/manage/files" : "/signin");
    }
  }, [pendingNav, isLoading, isAuthenticated, router]);

  function handleLoginClick(e: React.MouseEvent) {
    e.preventDefault();
    if (isLoading) {
      // Auth not settled yet, wait for it
      setPendingNav(true);
      return;
    }
    router.push(isAuthenticated ? "/manage/files" : "/signin");
  }
  return (
    <section className="relative min-h-screen pb-32">
      <div className="w-full h-[65vh] md:h-[60vh] relative overflow-visible flex flex-col items-center justify-center bg-[#08090a]">
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" aria-hidden="true" style={{ zIndex: 0, overflow: 'visible' }}>
        </svg>

        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(16px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start px-6 sm:px-16 w-full max-w-[1440px] relative z-10"
        >
          <a
            href="https://t.me/hypastack"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-2 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
            style={{ height: 30, paddingLeft: 16, paddingRight: 20, borderRadius: 15, fontSize: 13, fontWeight: 500, color: '#f7f8f8', backgroundColor: '#08090a', border: '1px solid #333' }}
          >
            <MIcon name="chat" size={14} style={{ color: '#898e97' }} />
            <div className="w-[1px] h-3.5 bg-[#333]" />
            <span>Join our Telegram channel</span>
          </a>
          <h1
            className="text-left text-[clamp(40px,6vw,76px)] leading-[1.05] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-medium"
            style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
          >
            Private sharing made simple
          </h1>
          <p className="mt-4 text-[16px] sm:text-[20px] font-light tracking-wide leading-relaxed text-[#898e97] text-left max-w-2xl">
            A secure CDN and file-sharing tool for when you need to get stuff from point A to point B without any extra hoops to jump through.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="absolute left-0 right-0 flex flex-wrap justify-start items-center gap-2 z-20 px-6 sm:px-16 w-full max-w-[1440px] mx-auto bottom-6 md:bottom-auto md:top-[calc(100%+2px)]"
        >
          <a
            href="https://github.com/HypaStack/Hypastack-Open-Source"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:bg-[#2a2a2a] active:scale-[0.97] transition-all duration-75"
            style={{ height: 32, paddingLeft: 11, paddingRight: 11, borderRadius: 9, fontSize: 13, fontWeight: 500, color: '#f7f8f8', backgroundColor: '#1a1a1a', border: '1px solid #333', boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
          >
            <img src="https://r2.hypastack.com/cdn/tniuzl9r383i/GitHub_Invertocat_Black.svg" alt="" className="w-[14px] h-[14px] select-none" draggable={false} style={{ filter: 'brightness(0) invert(1)' }} />
            <span>We're open source</span>
          </a>
          <a
            href="https://hypastack.com/d/987vw0zy#key=9OU2rAIyA3j3Eye90DrxYoimxWbNCcycuyT6LNn7_BA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
            style={{ height: 32, paddingLeft: 11, paddingRight: 11, borderRadius: 9, fontSize: 13, fontWeight: 500, color: '#f7f8f8', backgroundColor: '#0a0b0c', border: '1px solid #333', boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}
          >
            <MIcon name="desktop_windows" size={13} style={{ color: '#f7f8f8' }} />
            <span>Download for Windows</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
