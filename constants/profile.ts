/**
 * Profile identity rules (account nickname + public display name).
 * Modeled loosely on how large platforms rate-limit name changes.
 */

/** How long before a user can change their account nickname again (7 days). */
export const NICKNAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

/** How long before a user can change their public display name again (7 days). */
export const DISPLAY_NAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

/**
 * How long a released display name is held before anyone (including the previous
 * owner) can register it again. hypasched deletes the hold once it expires.
 */
export const DISPLAY_NAME_HOLD_DAYS = 14
