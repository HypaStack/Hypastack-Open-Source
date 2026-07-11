"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PageLogo } from "@/components/page-logo";
import { useAuth } from "@/hooks/useAuth";
import { ShineButton } from "@/components/ui/shine-button";
import { SecondaryButton } from "@/components/ui/secondary-button";

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
    <header className="fixed z-[9999] top-3 sm:top-4 left-0 right-0 mx-auto w-[calc(100%-1.5rem)] max-w-[880px] bg-[rgba(8,9,10,0.55)] backdrop-blur-2xl rounded-2xl border border-[rgba(255,255,255,0.08)] py-2 px-4 sm:px-5">
      <div className="w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp" alt="Hypastack" className="w-[32px] h-[32px] object-contain select-none pointer-events-none" draggable={false} />
        </Link>
        <div className="flex items-center gap-2">
          <SecondaryButton
            href="/signin"
            as={Link}
            onClick={handleLoginClick}
            size="sm"
          >
            Log in
          </SecondaryButton>
          <ShineButton
            href="/about"
            as={Link}
            size="sm"
          >
            Learn more
          </ShineButton>
        </div>
      </div>
    </header>
  );
}
