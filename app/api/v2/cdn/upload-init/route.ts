import { NextRequest } from "next/server"
import { handleCdnUploadInitPost } from "./_handler"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return handleCdnUploadInitPost(request)
}
