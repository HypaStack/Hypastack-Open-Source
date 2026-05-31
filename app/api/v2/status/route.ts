import { runFullBenchmark } from "@/lib/status-benchmarks"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const encoder = new TextEncoder()

// Module-level shared state — one loop, N clients
const clients = new Set<ReadableStreamDefaultController>()
let sharedInterval: ReturnType<typeof setInterval> | null = null
let lastSnapshot: string | null = null

function broadcast(payload: string) {
  for (const ctrl of clients) {
    try {
      ctrl.enqueue(encoder.encode(payload))
    } catch {
      // Client stream closed — remove it
      clients.delete(ctrl)
    }
  }
}

function startLoop() {
  if (sharedInterval) return
  sharedInterval = setInterval(async () => {
    try {
      const snapshot = await runFullBenchmark()
      lastSnapshot = `data: ${JSON.stringify(snapshot)}\n\n`
      broadcast(lastSnapshot)
    } catch (err: any) {
      console.error("[Status API] Benchmark tick failed:", err)
    }
  }, 10000)
}

function stopLoop() {
  if (clients.size === 0 && sharedInterval) {
    clearInterval(sharedInterval)
    sharedInterval = null
    lastSnapshot = null
  }
}

export async function GET(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      clients.add(controller)
      startLoop()

      // Send the last known snapshot immediately so the client isn't blank
      if (lastSnapshot) {
        try { controller.enqueue(encoder.encode(lastSnapshot)) } catch {}
      } else {
        // First client — run an initial benchmark right now
        try {
          const initial = await runFullBenchmark()
          lastSnapshot = `data: ${JSON.stringify(initial)}\n\n`
          controller.enqueue(encoder.encode(lastSnapshot))
        } catch (err: any) {
          console.error("[Status API] Initial benchmark failed:", err)
        }
      }

      request.signal.addEventListener("abort", () => {
        clients.delete(controller)
        stopLoop()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  })
}
