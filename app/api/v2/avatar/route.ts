import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserById } from "@/lib/user-model"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getR2Client, getBucketName } from "@/lib/r2"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = await getUserById(currentUser.userId)
    if (!user?.avatar_url) {
      return new NextResponse("No avatar", { status: 404 })
    }

    // Defense in depth: only ever sign objects under this user's own avatar
    // prefix. Prevents avatar_url (if ever tampered with) from being used to
    // mint presigned URLs for arbitrary objects in the bucket.
    const expectedPrefix = `profiles/${currentUser.userId}/`
    if (!user.avatar_url.startsWith(expectedPrefix)) {
      console.error("[Avatar] Rejected avatar_url outside user prefix")
      return new NextResponse("Invalid avatar", { status: 400 })
    }

    // Generate a short-lived presigned URL so private profiles/ bucket objects are accessible
    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: user.avatar_url,
      ResponseContentType: "image/webp",
    })

    const signedUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 3600 })
    return NextResponse.redirect(signedUrl, { status: 302 })
  } catch (error: any) {
    console.error("[Avatar] Error generating avatar URL:", error)
    return new NextResponse("Failed to load avatar", { status: 500 })
  }
}
