"use client"
import { useEffect, useState, type ReactNode } from "react"
import { Button, Input, Label, Modal, TextField, Toast, toast, typographyVariants } from "@heroui/react"
import { ProgressBar } from "./progress-bar"
import { AlertMessage } from "./alert-message"

export interface HypaNotifOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  progressText?: string
  isInput?: boolean
  inputPlaceholder?: string
  inputDefaultValue?: string
  /** Warning shown above the actions. Defaults to a permanent-delete note when destructive. */
  alertText?: string
  /** Async action run inside the dialog on confirm: the button shows a spinner,
   *  then the dialog closes. Errors show inline. */
  onConfirm?: () => Promise<void>
  /** Button label while onConfirm runs. Defaults to confirmText. */
  loadingText?: string
}

type NotifState = HypaNotifOptions & { id: string; resolve: (value: boolean | string | null) => void }

const rid = () => Math.random().toString(36).slice(2, 9)

const dispatch = (detail: NotifState) => {
  window.dispatchEvent(new CustomEvent("hypa-confirm", { detail }))
}

export const hypaConfirm = (options: HypaNotifOptions): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(false); return }
    dispatch({ ...options, id: rid(), resolve: (v) => resolve(v === true) })
  })

export const hypaPrompt = (options: HypaNotifOptions): Promise<string | null> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(null); return }
    dispatch({ ...options, isInput: true, id: rid(), resolve: (v) => resolve(typeof v === "string" ? v : null) })
  })

// Fire-and-forget toast. Non-blocking status feedback.
export const hypaToast = (options: HypaNotifOptions & { durationMs?: number }) => {
  const key = toast(options.title, { description: options.description, timeout: options.durationMs })
  return { id: key, close: () => toast.close(key) }
}

/** Convenience error toast, the title carries the message, description is optional detail. */
export const hypaError = (message: string, description?: string) => {
  const key = toast.danger(message, { description })
  return { id: key, close: () => toast.close(key) }
}

/** Live progress toast, so a long streaming job (bulk delete, folder wipe) can
 *  report where it's actually at. Stays up until close() is called. */
export const hypaProgress = (options: HypaNotifOptions) => {
  const id = rid()
  const key = toast(options.title, {
    description: <ProgressToastBody id={id} text={options.progressText} />,
    isLoading: true,
    timeout: 0,
  })
  return {
    id: key,
    update: (progressPercent: number, progressText?: string) =>
      window.dispatchEvent(new CustomEvent("hypa-progress", { detail: { id, progressPercent, progressText } })),
    close: () => toast.close(key),
  }
}

function ProgressToastBody({ id, text }: { id: string; text?: string }) {
  const [state, setState] = useState({ percent: 0, text: text ?? "Working…" })

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; progressPercent: number; progressText?: string }>).detail
      if (d.id !== id) return
      setState((prev) => ({ percent: d.progressPercent, text: d.progressText ?? prev.text }))
    }
    window.addEventListener("hypa-progress", onUpdate)
    return () => window.removeEventListener("hypa-progress", onUpdate)
  }, [id])

  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{state.text}</span>
        <span className="tabular-nums">{Math.round(state.percent)}%</span>
      </span>
      <ProgressBar value={state.percent} height={5} aria-label={state.text} />
    </span>
  )
}

/** Treat delete/wipe-style confirmations as destructive even if the caller
 *  didn't set the flag, so they get the red button + permanent-delete warning. */
function isDestructiveNotif(n: NotifState): boolean {
  if (n.destructive) return true
  const t = `${n.confirmText ?? ""} ${n.title ?? ""}`.toLowerCase()
  return /\b(wipe|delete|remove|erase|destroy)\b/.test(t) || t.includes("forever")
}

function NotifDialog({ notif, onResolve }: { notif: NotifState; onResolve: (id: string, value: boolean | string | null) => void }) {
  const [value, setValue] = useState(notif.inputDefaultValue ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const destructive = isDestructiveNotif(notif)

  const cancel = () => onResolve(notif.id, notif.isInput ? null : false)

  const confirm = async () => {
    if (notif.isInput) {
      if (!value.trim()) return
      onResolve(notif.id, value.trim())
      return
    }
    if (!notif.onConfirm) { onResolve(notif.id, true); return }
    setLoading(true)
    setError(null)
    try {
      await notif.onConfirm()
      onResolve(notif.id, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setLoading(false)
    }
  }

  const warning = error ?? notif.alertText ?? (destructive && !notif.isInput ? "This permanently deletes it and can't be recovered." : null)

  return (
    <Modal isOpen onOpenChange={(open) => { if (!open) cancel() }}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className={typographyVariants({ type: "h5" }).base()}>{notif.title}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body className="space-y-3">
              {notif.description && <p>{notif.description}</p>}
              {notif.isInput && (
                <TextField
                  value={value}
                  onChange={setValue}
                  className="w-full"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") confirm() }}
                >
                  <Label>{notif.inputPlaceholder ?? "Name"}</Label>
                  <Input placeholder={notif.inputPlaceholder ?? ""} />
                </TextField>
              )}
              {warning && <AlertMessage tone="error" style={{ marginBottom: 0 }}>{warning}</AlertMessage>}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" isDisabled={loading} onPress={cancel}>
                {notif.cancelText ?? "Cancel"}
              </Button>
              <Button
                variant={destructive ? "danger" : "primary"}
                isPending={loading}
                isDisabled={loading || (notif.isInput && !value.trim())}
                onPress={confirm}
              >
                {loading ? (notif.loadingText ?? notif.confirmText ?? "Confirm") : (notif.confirmText ?? (notif.isInput ? "Create" : "Confirm"))}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

/** Mounts the toast region plus the confirm/prompt dialog queue. */
export function HypaNotifProvider({ children }: { children?: ReactNode }) {
  const [notifs, setNotifs] = useState<NotifState[]>([])

  useEffect(() => {
    const onConfirm = (e: Event) => setNotifs((prev) => [...prev, (e as CustomEvent<NotifState>).detail])
    window.addEventListener("hypa-confirm", onConfirm)
    return () => window.removeEventListener("hypa-confirm", onConfirm)
  }, [])

  const handleResolve = (id: string, value: boolean | string | null) => {
    setNotifs((prev) => {
      prev.find((n) => n.id === id)?.resolve(value)
      return prev.filter((n) => n.id !== id)
    })
  }

  return (
    <>
      {children}
      {notifs[0] && <NotifDialog key={notifs[0].id} notif={notifs[0]} onResolve={handleResolve} />}
      <Toast.Provider placement="bottom" />
    </>
  )
}
