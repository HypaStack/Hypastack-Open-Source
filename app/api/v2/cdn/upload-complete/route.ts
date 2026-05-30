import { NextRequest } from "next/server"
import { handleCdnUploadCompletePost } from "./_handler"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return handleCdnUploadCompletePost(request)
}
