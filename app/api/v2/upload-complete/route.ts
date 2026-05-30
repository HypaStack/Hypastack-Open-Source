import { NextRequest } from "next/server"
import { handleUploadCompletePost } from "./_handler"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return handleUploadCompletePost(request)
}
