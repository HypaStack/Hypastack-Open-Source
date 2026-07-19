/** User's preferred UI theme ("light" | "dark" | "system") */
export const STORAGE_KEY_THEME = "hypa-theme"

/** User's preferred UI language code (e.g. "en", "fr") */
export const STORAGE_KEY_LANGUAGE = "hypa-language"

/** Interrupted upload state for resumable uploads */
export const STORAGE_KEY_INTERRUPTED_UPLOAD = "hypa_interrupted_upload"

/** Whether the donation/support notice banner has been dismissed */
export const STORAGE_KEY_DONATION_NOTICE = "hypastack_donation_notice_hidden"

/** Exported E2E master key for the active session */
export const STORAGE_KEY_E2E_MASTER = "hpsk_e2e_master"

/** Biometric unlock vault (credential id + wrapped access key) */
export const STORAGE_KEY_BIOMETRIC = "hpsk_bio_v1"

/** Discord webhook integration config */
export const STORAGE_KEY_DISCORD_WEBHOOK = "hpsk_discord_webhook"

/** Discord webhook recent activity log */
export const STORAGE_KEY_DISCORD_WEBHOOK_LOG = "hpsk_discord_webhook_log"

/** Pending (unsent) Discord webhook messages, drained with rate-limit spacing */
export const STORAGE_KEY_DISCORD_WEBHOOK_QUEUE = "hpsk_discord_webhook_queue"

/** Whether the Developer tab is revealed in preferences */
export const STORAGE_KEY_DEVELOPER_MODE = "hpsk_developer_mode"

/** Whether the CDN page's Ctrl-click multi-select hint has been dismissed */
export const STORAGE_KEY_HIDE_CTRL_HINT = "hideCtrlHint"
