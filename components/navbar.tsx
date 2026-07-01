"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PageLogo } from "@/components/page-logo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

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
    <header className="fixed z-[9999] top-0 left-0 right-0 mx-auto w-full max-w-[1440px] bg-[rgba(8,9,10,0.85)] backdrop-blur-2xl rounded-b-2xl py-2 px-6 sm:px-16">
      <div className="w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp" alt="Hypastack" className="w-[32px] h-[32px] object-contain select-none pointer-events-none" draggable={false} />
        </Link>
        <div className="flex items-center gap-2">
          <Button
            href="/signin"
            onClick={handleLoginClick}
            variant="landing-secondary"
            size="sm"
          >
            Log in
          </Button>
          <Button
            href="/about"
            variant="landing-primary"
            size="sm"
          >
            Learn more
          </Button>
        </div>
      </div>
    </header>
  );
}
