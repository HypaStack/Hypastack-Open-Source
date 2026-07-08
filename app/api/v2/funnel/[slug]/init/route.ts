import { NextRequest } from "next/server"
import { handleFunnelInit } from "./_handler"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  return handleFunnelInit(request, context)
}
