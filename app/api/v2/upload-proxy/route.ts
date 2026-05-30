import { NextRequest } from "next/server"
import { handleUploadProxyPost } from "./_handler"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return handleUploadProxyPost(request)
}
