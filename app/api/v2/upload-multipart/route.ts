import { NextRequest } from "next/server"
import { handleUploadMultipartPost } from "./_handler"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return handleUploadMultipartPost(request)
}
