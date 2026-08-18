"use client"

import { useEffect, useState } from "react"
import { Button, Description, FieldError, Input, Label, Modal, TextField, toast, typographyVariants } from "@heroui/react"
import { useManage } from "@/hooks/useManage"
import { getSessionKey, encryptE2E } from "@/lib/security/cryptoClient"
import { apiFetch } from "@/lib/http/fetch"
import { NICKNAME_CHANGE_COOLDOWN_MS } from "@/constants/profile"
import { errorMessage } from "@/lib/errors"
import { type PreferencesUser } from "./shared"

export function EditProfileDialog({
  open,
  user,
  onClose,
}: {
  open: boolean
  user: PreferencesUser
  onClose: () => void
}) {
  const { refreshUser } = useManage()
  const [nickname, setNickname] = useState(user.nickname)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setNickname(user.nickname)
  }, [open, user.nickname])

  // Username policy: letters/numbers only, no spaces or symbols, 3–12 chars.
  const nicknameError =
    nickname.length === 0 ? "" :
    /\s/.test(nickname) ? "No spaces allowed." :
    !/^[A-Za-z0-9]*$/.test(nickname) ? "Letters and numbers only — no symbols." :
    nickname.length < 3 ? "Must be at least 3 characters." :
    nickname.length > 12 ? "Must be 12 characters or fewer." : ""
  const isNicknameValid = /^[A-Za-z0-9]{3,12}$/.test(nickname)
  const [now] = useState(() => Date.now())
  const nickChanged = nickname.trim() !== user.nickname
  const nickCooldownMs = user.nicknameChangedAt
    ? Math.max(0, new Date(user.nicknameChangedAt).getTime() + NICKNAME_CHANGE_COOLDOWN_MS - now)
    : 0
  const nickCooldownDays = Math.ceil(nickCooldownMs / (24 * 60 * 60 * 1000))
  const nickCooldownLocked = nickChanged && nickCooldownMs > 0

  const saveNickname = async () => {
    const sessionKey = await getSessionKey()
    if (!sessionKey) throw new Error("We couldn't find your session key, please log out and log in, then retry.")

    const nickname_encrypted = await encryptE2E(nickname.trim(), sessionKey)
    const res = await apiFetch("/api/v2/auth/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname_encrypted }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || data.error || "Profile update failed, Submit feedback")
    await refreshUser()
  }

  const handleSave = () => {
    if (saving || !isNicknameValid || nickCooldownLocked) return
    if (nickname.trim() === user.nickname) { onClose(); return }
    setSaving(true)
    const saved = saveNickname()
    toast.promise(saved, {
      loading: "Saving changes…",
      success: "Changes saved",
      error: (err) => errorMessage(err, "Well.. something got tangled up, try again later."),
    })
    saved.then(onClose).catch(() => {}).finally(() => setSaving(false))
  }

  return (
    <Modal isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className={typographyVariants({ type: "h5" }).base()}>Edit profile</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body>
              <TextField
                value={nickname}
                onChange={setNickname}
                isInvalid={!!nicknameError}
                className="w-full"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
              >
                <Label>Username</Label>
                <Input />
                {nicknameError
                  ? <FieldError>{nicknameError}</FieldError>
                  : nickCooldownMs > 0
                    ? <Description>You can change your username again in {nickCooldownDays === 1 ? "1 day" : `${nickCooldownDays} days`}.</Description>
                    : null}
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" isDisabled={saving} onPress={onClose}>Cancel</Button>
              <Button
                variant="primary"
                isPending={saving}
                isDisabled={saving || !isNicknameValid || nickCooldownLocked}
                onPress={handleSave}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
