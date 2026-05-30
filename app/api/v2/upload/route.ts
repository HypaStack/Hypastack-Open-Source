import { NextRequest } from "next/server"
import { handleUploadPost } from "@/app/api/v2/upload/_handler"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return handleUploadPost(request)
}
