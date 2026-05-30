import { NextRequest } from "next/server"
import { handleFileGet } from "./_handler"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleFileGet(request, context)
}
