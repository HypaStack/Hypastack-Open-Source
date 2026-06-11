"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MIcon } from "@/components/ui/material-icon";
import { useManage } from "@/hooks/useManage";
import { TIER_LABELS } from "@/constants";
import { apiFetch } from "@/lib/fetch"

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
            className="theme-dashboard relative mx-4 w-full max-w-[420px] rounded-md overflow-hidden"
            style={{ backgroundColor: '#171717', padding: 4, boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)' }}
          >
            <div className="flex items-center justify-end px-4 pt-3 pb-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex items-center justify-center hover:bg-[#222] hover:text-white transition-all duration-75 active:scale-[0.95] shrink-0"
                style={{ height: 32, width: 32, borderRadius: 6, color: '#a1a1aa' }}
              >
                <MIcon name="close" size={16} />
              </button>
            </div>

            <div className="px-5 pt-2 pb-6 flex flex-col items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-[#222] mb-5">
                <MIcon name="auto_awesome" className="text-[#a1a1aa]" size={28} />
              </div>

              <h2
                id="tier-announcement-title"
                className="text-[22px] tracking-tight text-white mb-2"
                style={{ fontWeight: 600, letterSpacing: '-0.02em' }}
              >
                You're now on {tierLabel}
              </h2>
              <p className="text-[14px] leading-relaxed text-[#888] mb-6">
                Thanks for supporting us! Your new limits are unlocked everywhere,
                uploads, CDN storage, and retention windows.
              </p>

              <button
                onClick={handleDismiss}
                disabled={closing}
                className="w-full hover:bg-[#222] hover:text-white active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                style={{ height: 40, borderRadius: 6, fontSize: 14, fontWeight: 500, color: '#e3e3e3', backgroundColor: '#1f1f1f' }}
              >
                {closing ? "Closing.." : "Alright"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
