// Fires after an upload, link sent minus its decryption key fragment. Relayed
// through /api/v2/integrations/discord since browsers can't call webhooks (no CORS).

import { apiFetch } from "@/lib/http/fetch"
import {
  STORAGE_KEY_DISCORD_WEBHOOK,
  STORAGE_KEY_DISCORD_WEBHOOK_LOG,
  STORAGE_KEY_DISCORD_WEBHOOK_QUEUE,
  WEBHOOK_LOG_EVENT,
  WEBHOOK_LOG_MAX_ENTRIES,
  WEBHOOK_BATCH_DELAY_MS,
  DISCORD_MAX_EMBEDS_PER_MESSAGE,
  DISCORD_MAX_EMBED_TITLE_LENGTH,
  DISCORD_EMBED_COLOR,
} from "@/constants"
import { formatBytes } from "@/lib/format"

export interface WebhookConfig {
  url: string
  enabled: boolean
  /**
   * Off by default. Everything else about an upload is encrypted client-side,
   * so putting the plaintext filename into a chat channel has to be something
   * the user asks for, never something they get handed.
   */
  includeFilenames: boolean
}

/** One uploaded file as the webhook layer sees it. Name/size may be unknown
 *  (NaN / "") on the fallback path where only links survived. */
export interface UploadEntry {
  link: string
  name: string
  size: number
}

export interface UploadMeta {
  /**
   * null means the upload never expires (CDN assets live on permanent URLs).
   * That is a different statement from "we don't know", which is what a
   * non-positive value means, so the two render differently.
   */
  expirationMinutes: number | null
  burnOnRead: boolean
}

interface EmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface DiscordEmbed {
  title: string
  url: string
  color: number
  timestamp: string
  fields: EmbedField[]
}

export interface WebhookLogEntry {
  ts: number
  ok: boolean
  link: string
  error?: string
}

const EMPTY_CONFIG: WebhookConfig = { url: "", enabled: false, includeFilenames: false }

export function getWebhookConfig(): WebhookConfig {
  if (typeof window === "undefined") return { ...EMPTY_CONFIG }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCORD_WEBHOOK)
    if (!raw) return { ...EMPTY_CONFIG }
    const p = JSON.parse(raw)
    // Configs stored before filenames were opt-in have no such key, and the
    // safe reading of a missing privacy flag is "off".
    return {
      url: typeof p.url === "string" ? p.url : "",
      enabled: !!p.enabled,
      includeFilenames: !!p.includeFilenames,
    }
  } catch {
    return { ...EMPTY_CONFIG }
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

interface DiscordPayload {
  content?: string
  embeds?: DiscordEmbed[]
}

async function post(url: string, payload: DiscordPayload, retries = 3): Promise<void> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await apiFetch("/api/v2/integrations/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, ...payload }),
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
  await post(url, { content: "Hypastack webhook connected. You'll get a ping here on each upload." })
}

// ── Persistent send queue ──────────────────────────────────────────────────
// Messages wait in localStorage until delivered, closing the tab mid-drain loses nothing.

// `content` still appears on entries queued before embeds landed, so the drain
// loop has to keep handling both shapes.
interface QueueEntry {
  content?: string
  embeds?: DiscordEmbed[]
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
        await post(url, head.embeds ? { embeds: head.embeds } : { content: head.content ?? "" })
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

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…"
}

/**
 * Builds the embeds for one upload batch. Pure and exported so the privacy
 * rules (no filename unless opted in, never a key fragment) can be tested
 * without a browser.
 *
 * `now` is injectable because the expiry timestamp is derived from it.
 */
export function buildUploadEmbeds(
  uploads: UploadEntry[],
  meta: UploadMeta,
  includeFilenames: boolean,
  now: number = Date.now(),
): DiscordEmbed[] {
  const timestamp = new Date(now).toISOString()

  return uploads.map((upload) => {
    const fields: EmbedField[] = []

    // Unknown on the fallback path, where a link was recovered without its file.
    if (Number.isFinite(upload.size) && upload.size >= 0) {
      fields.push({ name: "Size", value: formatBytes(upload.size), inline: true })
    }

    // Discord's own relative timestamp, so the embed still reads correctly
    // whenever it is scrolled back to, not just when it arrived. A permanent
    // upload says so outright rather than dropping the field, which would be
    // indistinguishable from an expiry we couldn't work out.
    if (meta.expirationMinutes === null) {
      fields.push({ name: "Expires", value: "Never", inline: true })
    } else if (Number.isFinite(meta.expirationMinutes) && meta.expirationMinutes > 0) {
      const expiresAt = Math.floor((now + meta.expirationMinutes * 60_000) / 1000)
      fields.push({ name: "Expires", value: `<t:${expiresAt}:R>`, inline: true })
    }

    if (meta.burnOnRead) {
      fields.push({ name: "Burn on read", value: "Yes", inline: true })
    }

    // The title is the one place a filename could reach the channel, so it is
    // gated here rather than at the call site.
    const named = includeFilenames && upload.name.trim() !== ""

    return {
      title: named ? truncate(upload.name, DISCORD_MAX_EMBED_TITLE_LENGTH) : "New Hypastack upload",
      url: stripKey(upload.link),
      color: DISCORD_EMBED_COLOR,
      timestamp,
      fields,
    }
  })
}

/** Splits embeds across messages, since Discord rejects a payload carrying more than ten. */
export function chunkEmbeds(embeds: DiscordEmbed[]): DiscordEmbed[][] {
  const chunks: DiscordEmbed[][] = []
  for (let i = 0; i < embeds.length; i += DISCORD_MAX_EMBEDS_PER_MESSAGE) {
    chunks.push(embeds.slice(i, i + DISCORD_MAX_EMBEDS_PER_MESSAGE))
  }
  return chunks
}

// Fire-and-forget, never throws, a webhook problem must not affect upload UX.
// Multi-file uploads pack into one message, split only past Discord's ten-embed cap.
export async function dispatchUploadLinks(uploads: UploadEntry[], meta: UploadMeta): Promise<void> {
  const cfg = getWebhookConfig()
  if (!cfg.enabled || !isValidDiscordWebhook(cfg.url) || uploads.length === 0) return

  const embeds = buildUploadEmbeds(uploads, meta, cfg.includeFilenames)
  const entries: QueueEntry[] = chunkEmbeds(embeds).map((chunk) => ({
    embeds: chunk,
    // The log is the user's own record, so it holds links, never filenames.
    label: chunk.length === 1 ? chunk[0].url : `${chunk[0].url} +${chunk.length - 1} more`,
  }))

  setQueue([...getQueue(), ...entries])
  await drainQueue(cfg.url)
}
