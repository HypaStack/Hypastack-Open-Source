import { runFullBenchmark } from "@/lib/status-benchmarks"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const snapshot = await runFullBenchmark()
    return Response.json(snapshot)
  } catch (err: any) {
    console.error("[Status API] Benchmark failed:", err)
    return Response.json({ error: "Benchmark failed", detail: err?.message }, { status: 500 })
  }
}
