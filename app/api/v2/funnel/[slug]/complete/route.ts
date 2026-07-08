import { NextRequest } from "next/server"
import { handleFunnelComplete } from "./_handler"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  return handleFunnelComplete(request, context)
}
