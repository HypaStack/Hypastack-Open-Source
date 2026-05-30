/**
 * Monero payment processing configuration.
 *
 * Tier prices in XMR. These are MONTHLY prices.
 * Updated via env vars or hardcoded defaults.
 *
 * The payment flow:
 *  1. User selects a tier on the billing page
 *  2. Backend creates a unique Monero subaddress for this payment
 *  3. User sends XMR to that address
 *  4. Backend polls for incoming transfers
 *  5. Once confirmed (≥ REQUIRED_CONFIRMATIONS), tier is upgraded
 *  6. Payment record is stored in DB
 */

import { Tier } from "./tier-limits"

// ── Pricing ─────────────────────────────────────────────────────────────

// XMR prices per tier per month. Override via env if needed.
export const TIER_PRICES_XMR: Record<Exclude<Tier, "free">, number> = {
  essential: parseFloat(process.env.PRICE_ESSENTIAL_XMR || "0.03"),
  premium:   parseFloat(process.env.PRICE_PREMIUM_XMR   || "0.06"),
  ultimate:  parseFloat(process.env.PRICE_ULTIMATE_XMR   || "0.12"),
}

// Minimum confirmations before we consider a payment settled.
// 10 is standard for Monero — takes ~20 minutes.
export const REQUIRED_CONFIRMATIONS = parseInt(
  process.env.MONERO_REQUIRED_CONFIRMATIONS || "10",
  10
)

// How long a payment invoice stays valid (in milliseconds).
// Default: 2 hours. After this, the payment is expired and the user
// needs to create a new one.
export const PAYMENT_EXPIRY_MS = parseInt(
  process.env.MONERO_PAYMENT_EXPIRY_MS || String(2 * 60 * 60 * 1000),
  10
)

// Tolerance: accept payments within 2% of the expected amount
// to account for exchange rate fluctuation during send.
export const AMOUNT_TOLERANCE = 0.02

// ── Duration ────────────────────────────────────────────────────────────

/**
 * How many days of service a single monthly payment grants.
 * Used to calculate `paid_until` timestamp.
 */
export const PAYMENT_DURATION_DAYS = 30

/**
 * Get the price in XMR for a given tier.
 * Returns 0 for free tier.
 */
export function getTierPriceXmr(tier: Tier): number {
  if (tier === "free") return 0
  return TIER_PRICES_XMR[tier] ?? 0
}

/**
 * Validate that a tier is a paid tier that can be purchased.
 */
export function isPurchasableTier(tier: string): tier is Exclude<Tier, "free"> {
  return tier === "essential" || tier === "premium" || tier === "ultimate"
}
