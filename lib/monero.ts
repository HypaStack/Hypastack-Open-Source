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

  // When --disable-rpc-login is used no auth header is needed; digest auth is handled externally
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

export async function createSubaddress(label: string): Promise<{
  address: string
  address_index: number
}> {
  return rpc("create_address", {
    account_index: 0,
    label,
  })
}

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

export async function getBalance(): Promise<{
  balance: number
  unlocked_balance: number
}> {
  return rpc("get_balance", { account_index: 0 })
}

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

/** 1 XMR = 1e12 piconero */
const PICONERO = 1_000_000_000_000

export function xmrToAtomicUnits(xmr: number): number {
  return Math.round(xmr * PICONERO)
}

export function atomicUnitsToXmr(atomic: number): string {
  return (atomic / PICONERO).toFixed(12)
}

export function formatXmr(atomic: number): string {
  const xmr = atomic / PICONERO
  if (xmr >= 1) return xmr.toFixed(4) + " XMR"
  if (xmr >= 0.01) return xmr.toFixed(6) + " XMR"
  return xmr.toFixed(8) + " XMR"
}
