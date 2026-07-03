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
    if (!user?.banner_url) {
      return new NextResponse("No banner", { status: 404 })
    }

    // Defense in depth: only ever sign objects under this user's own profile
    // prefix, mirroring the avatar route.
    const expectedPrefix = `profiles/${currentUser.userId}/`
    if (!user.banner_url.startsWith(expectedPrefix)) {
      console.error("[Banner] Rejected banner_url outside user prefix")
      return new NextResponse("Invalid banner", { status: 400 })
    }

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: user.banner_url,
      ResponseContentType: imageContentTypeFromKey(user.banner_url),
    })

    const signedUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 3600 })
    return NextResponse.redirect(signedUrl, { status: 302 })
}, { label: "Banner" })
