"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PageLogo } from "@/components/page-logo";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "motion/react";
import { MIcon } from "@/components/ui/material-icon";

function SkeletonPulse({ className }: { className: string }) {
  return <div className={`rounded bg-[rgba(0,0,0,0.1)] animate-pulse ${className}`} />;
}

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll(); // init
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popoverOpen]);

  const content = (
    <header
      className={`fixed z-[9999] transition-all duration-300 left-0 right-0 mx-auto ${
        scrolled
          ? "top-4 sm:top-6 w-[calc(100%-32px)] max-w-[800px] bg-[rgba(255,255,255,0.85)] backdrop-blur-2xl border border-[rgba(0,0,0,0.15)] shadow-[0_16px_48px_rgba(0,0,0,0.12)] rounded-[24px] py-2 px-3"
          : "top-0 w-full max-w-[1200px] bg-transparent border border-transparent shadow-none rounded-none py-5 px-6"
      }`}
    >
      <div className="w-full flex items-center justify-between">
        
        {/* Left: Logo & Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <PageLogo size={32} borderRadius={8} />
          <span className="text-[17px] font-semibold tracking-tight text-[#171717] group-hover:opacity-80 transition-opacity">
            Hypastack
          </span>
        </Link>

        {/* Right: Auth / Actions */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <SkeletonPulse className="h-9 w-20" />
              <SkeletonPulse className="h-9 w-28" />
            </div>
          ) : isAuthenticated && user ? (
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setPopoverOpen(!popoverOpen)}
                className="flex items-center gap-2 hover:bg-[rgba(0,0,0,0.04)] active:bg-[rgba(0,0,0,0.08)] transition-colors pl-3 pr-2 py-1.5 rounded-full border border-[rgba(0,0,0,0.06)] bg-white/50"
              >
                <span className="text-[14px] font-medium text-[#171717]">{user.nickname}</span>
                <MIcon name="expand_more" size={18} style={{ color: '#171717' }} />
              </button>

              {/* User Dropdown */}
              <AnimatePresence>
                {popoverOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-[calc(100%+8px)] right-0 w-[200px] z-50 bg-[rgba(255,255,255,0.85)] backdrop-blur-2xl border border-[rgba(0,0,0,0.08)] shadow-[0_16px_64px_rgba(0,0,0,0.08)] rounded-[24px] overflow-hidden p-2"
                  >
                    <Link
                      href="/manage/dashboard"
                      onClick={() => setPopoverOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#f4f4f5] transition-colors text-[14px] font-medium text-[#171717]"
                    >
                      <MIcon name="grid_view" size={18} className="text-[#525252]" />
                      Dashboard
                    </Link>
                    <Link
                      href="/manage/files"
                      onClick={() => setPopoverOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#f4f4f5] transition-colors text-[14px] font-medium text-[#171717]"
                    >
                      <MIcon name="folder" size={18} className="text-[#525252]" />
                      Active shares
                    </Link>
                    
                    <div className="h-[1px] bg-[rgba(0,0,0,0.08)] my-1.5 mx-2" />
                    
                    <button
                      onClick={() => {
                        setPopoverOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[rgba(239,68,68,0.1)] transition-colors text-[14px] font-medium text-[#ef4444] text-left"
                    >
                      <MIcon name="logout" size={18} />
                      Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/signin"
                className="hidden sm:inline-flex items-center justify-center hover:bg-[rgba(0,0,0,0.04)] active:scale-[0.97] transition-all duration-75 px-5 h-10 rounded-full text-[14px] font-medium text-[#171717] bg-transparent"
              >
                Sign In
              </Link>
              <Link
                href="/new"
                className="inline-flex items-center justify-center hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 px-5 h-10 rounded-full text-[14px] font-semibold text-white bg-[#030303]"
              >
                Start for free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
