// Discord webhook integration. Fires from the browser after an upload and sends
// a notification with the link *minus its key fragment* — the decryption key
// (after `#`) is never included, so the webhook only tells you an upload
// happened, it doesn't hand out access. Config + a small activity log live in
// localStorage (per device).

const CONFIG_KEY = "hpsk_discord_webhook"
const LOG_KEY = "hpsk_discord_webhook_log"
const MAX_LOG = 8
export const WEBHOOK_LOG_EVENT = "hpsk-webhook-log"

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
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return { url: "", enabled: false }
    const p = JSON.parse(raw)
    return { url: typeof p.url === "string" ? p.url : "", enabled: !!p.enabled }
  } catch {
    return { url: "", enabled: false }
  }
}

export function setWebhookConfig(cfg: WebhookConfig): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

export function getWebhookLog(): WebhookLogEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LOG_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearWebhookLog(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(LOG_KEY)
  window.dispatchEvent(new CustomEvent(WEBHOOK_LOG_EVENT))
}

function pushLog(entry: WebhookLogEntry): void {
  if (typeof window === "undefined") return
  const log = [entry, ...getWebhookLog()].slice(0, MAX_LOG)
  localStorage.setItem(LOG_KEY, JSON.stringify(log))
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
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      // Discord rate-limits with 429 — retryable like any transient error.
      if (!res.ok) throw new Error(`Discord responded ${res.status}`)
      return
    } catch (e) {
      lastErr = e
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
    }
  }
  throw lastErr
}

// Notify about one upload (keyless link), retrying with backoff, and record the
// outcome to the activity log. Throws on total failure.
export async function sendLink(url: string, link: string): Promise<void> {
  const safe = stripKey(link)
  try {
    await post(url, `📤 New Hypastack upload — ${safe}`)
    pushLog({ ts: Date.now(), ok: true, link: safe })
  } catch (e) {
    pushLog({ ts: Date.now(), ok: false, link: safe, error: e instanceof Error ? e.message : "Failed" })
    throw e
  }
}

// One-off connectivity check for the settings UI. Not logged.
export async function sendTest(url: string): Promise<void> {
  await post(url, "✅ Hypastack webhook connected — you'll get a ping here on each upload.")
}

// Fire-and-forget for a completed upload. Never throws — a webhook problem must
// not affect the upload UX; the failure is recorded in the log instead.
export async function dispatchUploadLinks(links: string[]): Promise<void> {
  const cfg = getWebhookConfig()
  if (!cfg.enabled || !isValidDiscordWebhook(cfg.url) || links.length === 0) return
  for (const link of links) {
    try {
      await sendLink(cfg.url, link)
    } catch {
      // already logged
    }
  }
}
