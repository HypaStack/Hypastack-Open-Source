"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Typography } from "@heroui/react";
import { useManage } from "@/hooks/useManage";
import { TIER_LABELS } from "@/constants";
import { apiFetch } from "@/lib/http/fetch"

export function TierAnnouncementModal() {
  const { user, refreshUser } = useManage();
  const router = useRouter();
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

  if (!user) return null;

  return (
    <Modal isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) handleDismiss() }}>
      <Modal.Backdrop isDismissable variant="blur" className="bg-black/60">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>You&rsquo;re now on {tierLabel}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <Typography type="body-sm" color="muted">
                Thanks for supporting us! Your new limits are unlocked everywhere.
              </Typography>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => router.push("/pricing")}>
                See benefits
              </Button>
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
