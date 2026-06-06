import { NextRequest } from "next/server"
import { handleHotSwapInit, handleHotSwapComplete } from "./_handler"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return handleHotSwapInit(request)
}

export async function PUT(request: NextRequest) {
  return handleHotSwapComplete(request)
}
