import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { getUserById } from "@/lib/models/userModel"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getR2Client, getBucketName } from "@/lib/storage/r2"
import { imageContentTypeFromKey } from "@/lib/storage/bannerType"

export const dynamic = "force-dynamic"

export const GET = withAuth(async ({ user: currentUser }) => {
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
      ResponseContentType: imageContentTypeFromKey(user.avatar_url),
    })

    const signedUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 3600 })
    return NextResponse.redirect(signedUrl, { status: 302 })
}, { label: "Avatar" })
