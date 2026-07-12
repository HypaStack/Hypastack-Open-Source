// Discord webhook integration. Fires from the browser after an upload and sends
// a notification with the link *minus its key fragment* — the decryption key
// (after `#`) is never included, so the webhook only tells you an upload
// happened, it doesn't hand out access. Config + a small activity log live in
// localStorage (per device). The actual POST to Discord is relayed through our
// own API (`/api/v2/integrations/discord`) because browsers can't call Discord
// webhooks directly (no CORS); the relay only forwards validated Discord URLs.

import { apiFetch } from "@/lib/http/fetch"
import {
  STORAGE_KEY_DISCORD_WEBHOOK,
  STORAGE_KEY_DISCORD_WEBHOOK_LOG,
  STORAGE_KEY_DISCORD_WEBHOOK_QUEUE,
  WEBHOOK_LOG_EVENT,
  WEBHOOK_LOG_MAX_ENTRIES,
  WEBHOOK_BATCH_DELAY_MS,
  DISCORD_MAX_CONTENT_LENGTH,
} from "@/constants"

export interface WebhookConfig {
  url: string
  enabled: boolean
}

export interface WebhookLogEntry {
  ts: number
  ok: boolean
  link: string
  error?: string
}

export function getWebhookConfig(): WebhookConfig {
  if (typeof window === "undefined") return { url: "", enabled: false }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCORD_WEBHOOK)
    if (!raw) return { url: "", enabled: false }
    const p = JSON.parse(raw)
    return { url: typeof p.url === "string" ? p.url : "", enabled: !!p.enabled }
  } catch {
    return { url: "", enabled: false }
  }
}

export function setWebhookConfig(cfg: WebhookConfig): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY_DISCORD_WEBHOOK, JSON.stringify(cfg))
}

export function getWebhookLog(): WebhookLogEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCORD_WEBHOOK_LOG)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearWebhookLog(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY_DISCORD_WEBHOOK_LOG)
  window.dispatchEvent(new CustomEvent(WEBHOOK_LOG_EVENT))
}

function pushLog(entry: WebhookLogEntry): void {
  if (typeof window === "undefined") return
  const log = [entry, ...getWebhookLog()].slice(0, WEBHOOK_LOG_MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY_DISCORD_WEBHOOK_LOG, JSON.stringify(log))
  window.dispatchEvent(new CustomEvent(WEBHOOK_LOG_EVENT))
}

// Accepts discord.com / discordapp.com (+ canary/ptb) webhook URLs.
export function isValidDiscordWebhook(url: string): boolean {
  return /^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url.trim())
}

// Drop the `#key` fragment so the decryption key is never sent.
function stripKey(link: string): string {
  return link.split("#")[0]
}

async function post(url: string, content: string, retries = 3): Promise<void> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await apiFetch("/api/v2/integrations/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, content }),
      })
      const data = await res.json().catch(() => ({ ok: false, status: 0 }))
      // Discord rate-limits with 429; any non-ok is retryable transient error.
      if (!res.ok || !data.ok) throw new Error(`Discord webhook failed (${data.status ?? res.status})`)
      return
    } catch (e) {
      lastErr = e
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
    }
  }
  throw lastErr
}

// One-off connectivity check for the settings UI. Not logged.
export async function sendTest(url: string): Promise<void> {
  await post(url, "✅ Hypastack webhook connected — you'll get a ping here on each upload.")
}

// ── Persistent send queue ────────────────────────────────────────────────────
// Messages wait in localStorage until actually delivered, so closing the tab
// mid-drain loses nothing — the queue resumes on the next visit
// (resumeWebhookQueue). Messages are spaced WEBHOOK_BATCH_DELAY_MS apart to
// stay clear of Discord's rate limit.

interface QueueEntry {
  content: string
  label: string
}

function getQueue(): QueueEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCORD_WEBHOOK_QUEUE)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setQueue(q: QueueEntry[]): void {
  if (typeof window === "undefined") return
  if (q.length === 0) localStorage.removeItem(STORAGE_KEY_DISCORD_WEBHOOK_QUEUE)
  else localStorage.setItem(STORAGE_KEY_DISCORD_WEBHOOK_QUEUE, JSON.stringify(q))
}

let _draining = false

async function drainQueue(url: string): Promise<void> {
  if (_draining) return
  _draining = true
  try {
    while (true) {
      const q = getQueue()
      if (q.length === 0) break
      const head = q[0]
      try {
        await post(url, head.content)
        pushLog({ ts: Date.now(), ok: true, link: head.label })
      } catch (e) {
        pushLog({ ts: Date.now(), ok: false, link: head.label, error: e instanceof Error ? e.message : "Failed" })
      }
      // Re-read: new entries may have been enqueued while sending.
      setQueue(getQueue().slice(1))
      if (getQueue().length > 0) await new Promise((r) => setTimeout(r, WEBHOOK_BATCH_DELAY_MS))
    }
  } finally {
    _draining = false
  }
}

// Kick a stalled queue (e.g. the tab was closed mid-drain). Call once when the
// app loads; a no-op when the queue is empty or the webhook is off.
export function resumeWebhookQueue(): void {
  const cfg = getWebhookConfig()
  if (!cfg.enabled || !isValidDiscordWebhook(cfg.url)) return
  if (getQueue().length > 0) void drainQueue(cfg.url)
}

// Fire-and-forget for a completed upload. Never throws — a webhook problem must
// not affect the upload UX; failures are recorded in the activity log instead.
// Multi-file uploads are packed into a single message, split only when
// Discord's 2000-char content cap forces it.
export async function dispatchUploadLinks(links: string[]): Promise<void> {
  const cfg = getWebhookConfig()
  if (!cfg.enabled || !isValidDiscordWebhook(cfg.url) || links.length === 0) return
  const safe = links.map(stripKey)

  const entries: QueueEntry[] = []
  if (safe.length === 1) {
    entries.push({ content: `📤 New Hypastack upload — ${safe[0]}`, label: safe[0] })
  } else {
    const batches: string[][] = []
    let current: string[] = []
    let length = 0
    for (const link of safe) {
      // +1 for the newline; keep 40 chars of headroom for the header line.
      if (current.length > 0 && length + link.length + 1 > DISCORD_MAX_CONTENT_LENGTH - 40) {
        batches.push(current)
        current = []
        length = 0
      }
      current.push(link)
      length += link.length + 1
    }
    if (current.length > 0) batches.push(current)
    for (const batch of batches) {
      entries.push({
        content: `📤 ${batch.length} new Hypastack uploads\n${batch.join("\n")}`,
        label: batch.length === 1 ? batch[0] : `${batch[0]} +${batch.length - 1} more`,
      })
    }
  }

  setQueue([...getQueue(), ...entries])
  await drainQueue(cfg.url)
}
