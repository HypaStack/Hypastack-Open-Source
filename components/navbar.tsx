"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PageLogo } from "@/components/page-logo";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const [, setScrolled] = useState(false);
  const [pendingNav, setPendingNav] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // navigate
  useEffect(() => {
    if (pendingNav && !isLoading) {
      setPendingNav(false);
      router.push(isAuthenticated ? "/manage/files" : "/signin");
    }
  }, [pendingNav, isLoading, isAuthenticated, router]);

  function handleLoginClick(e: React.MouseEvent) {
    e.preventDefault();
    if (isLoading) {
      // Auth not settled yet
      setPendingNav(true);
      return;
    }
    router.push(isAuthenticated ? "/manage/files" : "/signin");
  }

  return (
    <header className="fixed z-[9999] top-0 left-0 right-0 mx-auto w-full max-w-[1200px] bg-[rgba(255,255,255,0.85)] backdrop-blur-2xl rounded-b-2xl py-2 px-4 sm:px-6">
      <div className="w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <PageLogo size={32} borderRadius={8} />
        </Link>
        <div className="flex items-center gap-2">
          <a
            href="/signin"
            onClick={handleLoginClick}
            className="inline-flex items-center justify-center hover:bg-[rgba(0,0,0,0.04)] active:scale-[0.97] transition-all duration-75 px-4 h-9 rounded-full text-[14px] font-medium text-[#171717] bg-transparent cursor-pointer"
          >
            Log in
          </a>
          <Link
            href="#features"
            className="inline-flex items-center justify-center hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 px-4 sm:px-5 h-9 sm:h-10 rounded-full text-[13px] sm:text-[14px] font-semibold text-white bg-[#030303]"
          >
            Learn more
          </Link>
        </div>
      </div>
    </header>
  );
}
