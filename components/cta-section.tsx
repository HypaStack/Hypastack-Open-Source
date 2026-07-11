"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { MIcon } from "@/components/ui/material-icon";
import { ShineButton } from "@/components/ui/shine-button";
import { SecondaryButton } from "@/components/ui/secondary-button";

export function CtaSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative flex flex-col items-center overflow-visible">

      <div className="relative w-full max-w-[1200px]">
      <div className="relative w-full flex flex-col bg-[#08090a] z-[60]">
        <div className="w-full px-8 sm:px-6 pt-16 pb-16 text-left relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            {isAuthenticated ? (
              <>
                <h2
                  className="text-[clamp(28px,4.5vw,56px)] tracking-[-0.03em] leading-[1.1] text-[#f7f8f8] pb-1 flex items-center gap-3 sm:gap-4 font-normal"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
                >
                  <MIcon name="verified" size="1em" className="tracking-normal shrink-0 text-[#171717]" />
                  <div className="flex-1 min-w-0 truncate">
                    <span>Welcome <span className="text-[#898e97]">back!</span></span>
                  </div>
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-[#898e97] font-light max-w-[560px]">
                  Pick up right where you left off.
                </p>
                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <ShineButton href="/manage" as={Link} size="lg">
                    Go to Dashboard
                  </ShineButton>
                  <SecondaryButton href="/manage/files" as={Link} size="lg">
                    My Files
                  </SecondaryButton>
                </div>
              </>
            ) : (
              <>
                <h2
                  className="text-[clamp(28px,4.5vw,56px)] tracking-[-0.03em] leading-[1.1] text-[#f7f8f8] pb-1 whitespace-nowrap font-normal"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
                >
                  Wanna check <span className="text-[#898e97]">it out?</span>
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-[#898e97] font-light max-w-[560px]">
                  Make an account in seconds. No email and no tracking.
                </p>
                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <ShineButton href="/new" as={Link} size="lg">
                    Register
                  </ShineButton>
                  <SecondaryButton href="/signin" as={Link} size="lg">
                    Sign in
                  </SecondaryButton>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
      </div>
    </section>
  );
}
