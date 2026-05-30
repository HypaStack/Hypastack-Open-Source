/**
 * Monero Wallet RPC client.
 *
 * Communicates with a running monero-wallet-rpc instance via JSON-RPC 2.0.
 * No third-party dependencies — uses native `fetch`.
 *
 * Environment variables:
 *   MONERO_RPC_URL   — e.g. http://127.0.0.1:18082/json_rpc
 *   MONERO_RPC_USER  — (optional) digest-auth username
 *   MONERO_RPC_PASS  — (optional) digest-auth password
 */

const MONERO_RPC_URL = process.env.MONERO_RPC_URL || "http://127.0.0.1:18082/json_rpc"

interface RpcResponse<T = any> {
  id: string
  jsonrpc: "2.0"
  result?: T
  error?: { code: number; message: string }
}

async function rpc<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: "0",
    method,
    params,
  })

  const headers: Record<string, string> = { "Content-Type": "application/json" }

  // If digest auth is configured, monero-wallet-rpc expects it.
  // When --disable-rpc-login is used, no auth needed.
  const res = await fetch(MONERO_RPC_URL, {
    method: "POST",
    headers,
    body,
  })

  if (!res.ok) {
    throw new Error(`Monero RPC HTTP ${res.status}: ${await res.text()}`)
  }

  const json: RpcResponse<T> = await res.json()

  if (json.error) {
    throw new Error(`Monero RPC error ${json.error.code}: ${json.error.message}`)
  }

  return json.result as T
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Create a unique subaddress for receiving payment.
 * Each payment gets its own subaddress so we can track it independently.
 */
export async function createSubaddress(label: string): Promise<{
  address: string
  address_index: number
}> {
  return rpc("create_address", {
    account_index: 0,
    label,
  })
}

/**
 * Check incoming transfers to a specific subaddress index.
 * Returns confirmed and pending transfers.
 */
export async function getTransfers(subaddressIndex: number): Promise<{
  confirmed: MoneroTransfer[]
  pending: MoneroTransfer[]
}> {
  const result = await rpc("get_transfers", {
    in: true,
    pending: true,
    pool: true,
    subaddr_indices: [subaddressIndex],
    account_index: 0,
  })

  return {
    confirmed: (result.in || []) as MoneroTransfer[],
    pending: [...(result.pending || []), ...(result.pool || [])] as MoneroTransfer[],
  }
}

/**
 * Get the wallet's overall balance (for admin/debug).
 */
export async function getBalance(): Promise<{
  balance: number
  unlocked_balance: number
}> {
  return rpc("get_balance", { account_index: 0 })
}

/**
 * Get the wallet's current block height (for sync status).
 */
export async function getHeight(): Promise<{ height: number }> {
  return rpc("get_height")
}

export interface MoneroTransfer {
  txid: string
  amount: number           // in atomic units (piconero)
  confirmations: number
  height: number
  timestamp: number
  subaddr_index: { major: number; minor: number }
  address: string
  type: string
}

// ── Conversion helpers ──────────────────────────────────────────────────

/** 1 XMR = 1e12 piconero */
const PICONERO = 1_000_000_000_000

/** Convert XMR decimal to atomic piconero */
export function xmrToAtomicUnits(xmr: number): number {
  return Math.round(xmr * PICONERO)
}

/** Convert atomic piconero to XMR decimal string */
export function atomicUnitsToXmr(atomic: number): string {
  return (atomic / PICONERO).toFixed(12)
}

/** Format piconero as a human-readable XMR amount */
export function formatXmr(atomic: number): string {
  const xmr = atomic / PICONERO
  // Show enough precision but trim trailing zeros
  if (xmr >= 1) return xmr.toFixed(4) + " XMR"
  if (xmr >= 0.01) return xmr.toFixed(6) + " XMR"
  return xmr.toFixed(8) + " XMR"
}
