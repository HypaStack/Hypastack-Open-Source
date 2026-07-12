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
