"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ButtonLink } from "@/components/ui/button-link";

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
      router.push(isAuthenticated ? "/me/files" : "/signin");
    }
  }, [pendingNav, isLoading, isAuthenticated, router]);

  function handleLoginClick(e: React.MouseEvent) {
    e.preventDefault();
    if (isLoading) {
      // Auth not settled yet
      setPendingNav(true);
      return;
    }
    router.push(isAuthenticated ? "/me/files" : "/signin");
  }

  return (
    <header className="fixed z-[9999] top-3 sm:top-4 left-0 right-0 mx-auto w-[calc(100%-1.5rem)] max-w-[880px] bg-overlay rounded-[16px] border border-white/10 py-2 px-4 sm:px-5">
      <div className="w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img decoding="async" src="https://r2.hypastack.com/cdn/hypaasset/hypastack.webp" alt="Hypastack" className="w-[32px] h-[32px] object-contain select-none pointer-events-none" draggable={false} />
        </Link>
        <div className="flex items-center gap-2">
          <ButtonLink
            href="/signin"
            as={Link}
            onClick={handleLoginClick}
            variant="tertiary"
            size="sm"
          >
            Log in
          </ButtonLink>
          <ButtonLink
            href="/about"
            as={Link}
            variant="primary"
            size="sm"
            aria-label="Learn more about Hypastack"
          >
            Learn more
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
