"use client";

import { useEffect, useState } from "react";
import { MIcon } from "@/components/ui/material-icon";
import { Button, Modal, Typography } from "@heroui/react";
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

  if (!user) return null;

  return (
    <Modal isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) handleDismiss() }}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>You&rsquo;re now on {tierLabel}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body className="space-y-3">
              <Typography type="body-sm" color="muted">
                Thanks for supporting us! Your new limits are unlocked everywhere.
              </Typography>
              <ul className="space-y-2">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <MIcon name="check" size={16} className="text-muted shrink-0 mt-0.5" />
                    <Typography type="body-sm" className="text-foreground">{b}</Typography>
                  </li>
                ))}
              </ul>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="primary" onPress={handleDismiss} isDisabled={closing}>
                Alright
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
