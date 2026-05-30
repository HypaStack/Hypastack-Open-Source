/**
 * WebSocket Status Server
 *
 * Runs a standalone WS server alongside the Next.js process.
 * Broadcasts real benchmark snapshots to all connected clients
 * every 5 seconds. Uses the `ws` package directly.
 *
 * The server is started lazily the first time `/api/v2/status` is hit,
 * ensuring it only runs in the Node.js runtime and not in Edge.
 */

import { WebSocketServer, WebSocket } from "ws"
import { runFullBenchmark } from "./status-benchmarks"

declare global {
  // eslint-disable-next-line no-var
  var __statusWsServer: WebSocketServer | undefined
  // eslint-disable-next-line no-var
  var __statusWsInterval: NodeJS.Timeout | undefined
  // eslint-disable-next-line no-var
  var __statusWsPort: number | undefined
}

const WS_PORT = parseInt(process.env.STATUS_WS_PORT || "3099", 10)
const BROADCAST_INTERVAL = 1_000 // 1 second

/**
 * Ensure the WebSocket server is running. Idempotent — safe to call
 * from every API hit.
 */
export function ensureStatusWsServer(): number {
  if (globalThis.__statusWsServer) {
    return globalThis.__statusWsPort ?? WS_PORT
  }

  console.error(`[StatusWS] Starting WebSocket server on port ${WS_PORT}...`)

  const wss = new WebSocketServer({ port: WS_PORT, path: "/ws/status" })

  wss.on("listening", () => {
    console.error(`[StatusWS] WebSocket server listening on ws://localhost:${WS_PORT}/ws/status`)
  })

  wss.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[StatusWS] Port ${WS_PORT} already in use — reusing existing server`)
      return
    }
    console.error("[StatusWS] Server error:", err.message)
  })

  wss.on("connection", (ws) => {
    console.error("[StatusWS] Client connected")
    
    // Send an immediate snapshot on connect
    runFullBenchmark()
      .then((snapshot) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(snapshot))
        }
      })
      .catch((err) => {
        console.error("[StatusWS] Initial benchmark failed:", err.message)
      })

    ws.on("close", () => {
      console.error("[StatusWS] Client disconnected")
    })
  })

  // Broadcast loop — only runs benchmarks when there are connected clients
  const interval = setInterval(async () => {
    const clients = [...wss.clients].filter((c) => c.readyState === WebSocket.OPEN)
    if (clients.length === 0) return

    try {
      const snapshot = await runFullBenchmark()
      const payload = JSON.stringify(snapshot)
      for (const client of clients) {
        client.send(payload)
      }
    } catch (err: any) {
      console.error("[StatusWS] Broadcast benchmark failed:", err.message)
    }
  }, BROADCAST_INTERVAL)

  globalThis.__statusWsServer = wss
  globalThis.__statusWsInterval = interval
  globalThis.__statusWsPort = WS_PORT

  return WS_PORT
}
