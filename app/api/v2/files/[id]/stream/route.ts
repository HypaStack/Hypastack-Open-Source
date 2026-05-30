import { NextRequest } from "next/server"
import { handleStreamGet } from "./_handler"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleStreamGet(request, context)
}
