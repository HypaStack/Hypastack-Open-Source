/**
 * Credits and billing constants.
 * Shared between API routes, billing UI, and credit calculation logic.
 */

/** Number of free operation units available per user per month */
export const FREE_UNITS_PER_MONTH = 5000

/** How many operation units equal one credit */
export const UNITS_PER_CREDIT = 1000

/** Operation unit cost for a Class A operation (e.g. CDN writes) */
export const CLASS_A_COST = 4

/** Operation unit cost for a Class B operation (e.g. reads) */
export const CLASS_B_COST = 1

/** How many months purchased credits remain valid */
export const CREDIT_EXPIRY_MONTHS = 6

/** EUR price per single credit */
export const CREDIT_PRICE_EUR = 0.5

/** Minimum custom top-up amount in EUR */
export const MIN_CUSTOM_AMOUNT_EUR = 10

/** Pre-defined credit packages available for purchase */
export const CREDIT_PACKAGES = [
  { amountEur: 10, credits: 20, label: "€10" },
  { amountEur: 20, credits: 40, label: "€20" },
  { amountEur: 50, credits: 100, label: "€50" },
] as const

export type CreditPackage = (typeof CREDIT_PACKAGES)[number]
