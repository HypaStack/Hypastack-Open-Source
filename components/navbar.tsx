"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PageLogo } from "@/components/page-logo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { MIcon } from "@/components/ui/material-icon";

function SkeletonPulse({ className }: { className: string }) {
  return <div className={`rounded bg-[rgba(0,0,0,0.1)] animate-pulse ${className}`} />;
}

export function Navbar() {
  const { user, stats, isAuthenticated, isLoading, logout } = useAuth();
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
    <>
    <header
      className="fixed z-[9999] top-0 left-0 right-0 mx-auto w-full max-w-[1200px] bg-[rgba(255,255,255,0.85)] backdrop-blur-2xl rounded-b-2xl py-2 px-6"
    >
      <div className="w-full flex items-center justify-between">
        
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <PageLogo size={32} borderRadius={8} />
        </Link>

        {/* Right: Auth / Actions */}
        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <SkeletonPulse className="h-9 w-20" />
              <SkeletonPulse className="h-9 w-28" />
            </div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Button href="/manage/files" variant="primary" size="sm" className="hidden sm:inline-flex">
                Dashboard
              </Button>
              
              <div className="flex items-center gap-1.5">
                <div className="h-8 w-8 relative shrink-0">
                  {user.avatarUrl ? (
                    <img src={`/api/v2/avatar?t=${user.avatarUrl}`} alt={user.nickname} className="h-8 w-8 rounded-full object-cover select-none pointer-events-none" draggable={false} />
                  ) : (
                    <div className="h-8 w-8 flex items-center justify-center bg-[#ccc] text-white text-[12px] font-bold rounded-full select-none">
                      {(user.nickname || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="relative" ref={popoverRef}>
                  <button
                    onClick={() => setPopoverOpen(!popoverOpen)}
                    className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-[rgba(0,0,0,0.04)] active:bg-[rgba(0,0,0,0.08)] transition-colors text-[#666]"
                  >
                    <MIcon name="more_vert" size={20} />
                  </button>

                  <AnimatePresence>
                    {popoverOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-[calc(100%+8px)] right-0 w-[280px] z-50 bg-[rgba(255,255,255,0.85)] backdrop-blur-2xl border border-[rgba(0,0,0,0.08)] shadow-[0_16px_64px_rgba(0,0,0,0.08)] rounded-[16px] overflow-hidden py-2"
                      >
                        <div className="px-3 pb-2">
                          <p className="text-sm font-semibold text-[#171717]">{user.nickname}</p>
                          <p className="text-xs text-[#666] mt-0.5">{user.id}</p>
                        </div>
                        
                        <div className="mx-3 border-b border-[rgba(0,0,0,0.08)] mb-1" />
                        
                        <div className="px-1.5 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => { setPopoverOpen(false); logout(); }}
                            className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium text-[#333] hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444] transition-colors cursor-pointer"
                          >
                            <MIcon name="logout" size={18} className="text-[#666] group-hover:text-[#ef4444] transition-colors" />
                            <span>Log out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
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
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
