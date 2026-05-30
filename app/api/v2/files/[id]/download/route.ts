import { NextRequest } from "next/server"
import { handleDownloadPost } from "./_handler"

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleDownloadPost(request, context)
}
