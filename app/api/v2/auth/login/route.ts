import { NextRequest } from "next/server"
import { handleLoginPost } from "./_handler"

export async function POST(request: NextRequest) {
  return handleLoginPost(request)
}
