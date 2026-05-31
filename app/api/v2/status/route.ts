import { runFullBenchmark } from "@/lib/status-benchmarks"

export const dynamic = "force-dynamic"
// Use Node.js runtime because crypto operations and heavy DB queries
// work best/exclusively in the full Node environment.
export const runtime = "nodejs"

export async function GET(request: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial snapshot immediately
      try {
        const initial = await runFullBenchmark()
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initial)}\n\n`))
      } catch (err: any) {
        console.error("[Status API] Initial benchmark failed:", err)
      }

      // Loop every 3 seconds
      const intervalId = setInterval(async () => {
        try {
          const snapshot = await runFullBenchmark()
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`))
        } catch (err: any) {
          console.error("[Status API] Benchmark tick failed:", err)
        }
      }, 10000)

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId)
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
