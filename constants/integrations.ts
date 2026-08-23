/**
 * Third-party integration constants (Discord webhooks).
 * Storage keys for the webhook config/log live in constants/storage-keys.ts.
 */

/** CustomEvent fired on window whenever the webhook activity log changes */
export const WEBHOOK_LOG_EVENT = "hpsk-webhook-log"

/** Max entries kept in the webhook activity log */
export const WEBHOOK_LOG_MAX_ENTRIES = 8

/** Delay in ms between batched webhook messages (Discord rate-limit headroom) */
export const WEBHOOK_BATCH_DELAY_MS = 10_000

/** Discord's hard cap on message content length */
export const DISCORD_MAX_CONTENT_LENGTH = 2000

/** Feedback body cap, well under Discord's 2000 so the header always fits. */
export const MAX_FEEDBACK_LENGTH = 1500

/** Appeal body cap, the header carries an account id and an ip hash too. */
export const MAX_APPEAL_LENGTH = 1200

/** Discord's hard cap on embeds per message; more than this rejects the whole payload. */
export const DISCORD_MAX_EMBEDS_PER_MESSAGE = 10

/** Discord embed field limits, enforced client-side and re-checked by the relay. */
export const DISCORD_MAX_EMBED_TITLE_LENGTH = 256
export const DISCORD_MAX_EMBED_URL_LENGTH = 2048
export const DISCORD_MAX_EMBED_FIELDS = 25
export const DISCORD_MAX_EMBED_FIELD_NAME_LENGTH = 256
export const DISCORD_MAX_EMBED_FIELD_VALUE_LENGTH = 1024

/**
 * Sidebar colour on every upload embed. The app's own palette is near-black on
 * near-white, and either extreme disappears into one of Discord's two themes,
 * so this is the muted-foreground grey, which reads on both.
 */
export const DISCORD_EMBED_COLOR = 0x898e97
