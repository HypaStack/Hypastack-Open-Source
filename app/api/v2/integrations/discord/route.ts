import { NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { isValidDiscordWebhook } from "@/lib/integrations/discordWebhook"
import {
  API_ERRORS,
  DISCORD_MAX_CONTENT_LENGTH,
  DISCORD_MAX_EMBEDS_PER_MESSAGE,
  DISCORD_MAX_EMBED_TITLE_LENGTH,
  DISCORD_MAX_EMBED_URL_LENGTH,
  DISCORD_MAX_EMBED_FIELDS,
  DISCORD_MAX_EMBED_FIELD_NAME_LENGTH,
  DISCORD_MAX_EMBED_FIELD_VALUE_LENGTH,
} from "@/constants"

export const dynamic = "force-dynamic"

const EmbedFieldSchema = z.strictObject({
  name: z.string().min(1).max(DISCORD_MAX_EMBED_FIELD_NAME_LENGTH),
  value: z.string().min(1).max(DISCORD_MAX_EMBED_FIELD_VALUE_LENGTH),
  inline: z.boolean().optional(),
})

// Deliberately narrow: only the embed shape dispatchUploadLinks builds. This is
// an authenticated relay to a third-party host, not a JSON pass-through, so
// anything it doesn't recognise is rejected rather than forwarded.
const EmbedSchema = z.strictObject({
  title: z.string().min(1).max(DISCORD_MAX_EMBED_TITLE_LENGTH),
  url: z.url().max(DISCORD_MAX_EMBED_URL_LENGTH),
  color: z.number().int().min(0).max(0xffffff),
  timestamp: z.iso.datetime(),
  fields: z.array(EmbedFieldSchema).max(DISCORD_MAX_EMBED_FIELDS),
})

const RelaySchema = z.strictObject({
  url: z.string().refine(isValidDiscordWebhook, "Invalid webhook URL"),
  content: z.string().min(1).max(DISCORD_MAX_CONTENT_LENGTH).optional(),
  embeds: z.array(EmbedSchema).min(1).max(DISCORD_MAX_EMBEDS_PER_MESSAGE).optional(),
}).refine((b) => b.content !== undefined || b.embeds !== undefined, {
  message: "Either content or embeds is required",
})

// Relays to Discord since browsers can't POST webhooks directly (no CORS).
// SSRF-guarded: only well-formed Discord webhook URLs fetched, redirects refused.
export const POST = withAuth(async ({ request }) => {
  const validation = RelaySchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) {
    return apiError(400, API_ERRORS.BAD_REQUEST, validation.error.issues[0].message)
  }
  const { url, content, embeds } = validation.data

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // parse: [] means an "@everyone" inside a user-controlled filename stays plain text
      body: JSON.stringify({
        ...(content !== undefined ? { content } : {}),
        ...(embeds !== undefined ? { embeds } : {}),
        allowed_mentions: { parse: [] },
      }),
      redirect: "error",
    })
    return NextResponse.json({ ok: res.ok, status: res.status })
  } catch {
    return NextResponse.json({ ok: false, status: 0 })
  }
}, { rateLimit: true, label: "Discord Webhook Relay" })
