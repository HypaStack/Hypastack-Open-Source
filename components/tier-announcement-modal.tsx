"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MIcon } from "@/components/ui/material-icon";
import { ShineButton } from "@/components/ui/shine-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Loader } from "@/components/ui/loader";
import { useManage } from "@/hooks/useManage";
import { TIER_LABELS } from "@/constants";
import { PLAN_INFO } from "@/constants/plans";
import { apiFetch } from "@/lib/http/fetch"

export function TierAnnouncementModal() {
  const { user, refreshUser } = useManage();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // surface the modal whenever the db tier doesn't match what the user acknowledged
  useEffect(() => {
    if (!user) return;
    if (user.tier === "free") return;
    if (user.tier === user.lastAcknowledgedTier) return;
    setOpen(true);
  }, [user]);

  const tierLabel = user ? (TIER_LABELS[user.tier] ?? user.tier) : "";
  const benefits = user ? (PLAN_INFO.find((p) => p.key === user.tier)?.details ?? []) : [];

  const handleDismiss = async () => {
    if (closing) return;
    setClosing(true);
    try {
      await apiFetch("/api/v2/auth/acknowledge-tier", {
        method: "POST",
        credentials: "include",
      });
      await refreshUser();
    } catch (error) {
      console.error("[TierAnnouncement] Failed to acknowledge tier:", error);
    } finally {
      setOpen(false);
      setClosing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && user && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tier-announcement-title"
          className="fixed inset-0 z-[200] flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="theme-dashboard relative w-[calc(100%-2rem)] sm:w-full max-w-[720px] rounded-[20px] overflow-hidden"
            style={{ backgroundColor: '#121212', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)' }}
          >
            <SecondaryButton
              iconOnly
              size="xs"
              onClick={handleDismiss}
              aria-label="Dismiss"
              style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }}
            >
              <MIcon name="close" size={18} />
            </SecondaryButton>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="flex flex-col items-start text-left px-8 pt-11 pb-10">
                <div className="flex size-14 items-center justify-center mb-6">
                  <MIcon name="auto_awesome" className="text-[#f7f8f8]" size={28} />
                </div>

                <h2
                  id="tier-announcement-title"
                  className="text-[26px] tracking-tight text-[#f7f8f8] mb-2"
                  style={{ fontWeight: 600, letterSpacing: '-0.02em', fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
                >
                  You're now on {tierLabel}
                </h2>
                <p className="text-[14px] leading-relaxed text-[#898e97] mb-8">
                  Thanks for supporting us! Your new limits are unlocked everywhere,
                  uploads, CDN storage, and retention windows.
                </p>

                <ShineButton
                  theme="dark"
                  size="md"
                  fullWidth
                  className="mt-auto"
                  onClick={handleDismiss}
                  disabled={closing}
                >
                  {closing ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader size={16} stroke={2} />
                      Closing..
                    </span>
                  ) : "Alright"}
                </ShineButton>
              </div>

              <div className="px-8 py-11 border-t sm:border-t-0 sm:border-l border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
                <p className="text-[13px] font-semibold text-[#f7f8f8] mb-5">What's included</p>
                <ul className="space-y-4">
                  {benefits.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <MIcon name="check" size={17} className="shrink-0 mt-0.5 text-[#a5b4fc]" />
                      <span className="text-[14px] leading-snug text-[#d4d6d9]">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
