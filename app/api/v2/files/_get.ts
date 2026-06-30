import { NextResponse } from "next/server"
import { withAuth } from "@/lib/route"
import { getFilesByUserId } from "@/lib/file-model"
import { decryptFilename } from "@/lib/filename-crypto"

export const GET = withAuth(async ({ user }) => {
  const files = await getFilesByUserId(user.userId)

  return NextResponse.json({
    files: files.map(f => ({
      id: f.id,
      name: decryptFilename(f.custom_filename || f.original_name),
      size: f.file_size,
      contentType: f.content_type,
      uploadedAt: f.upload_date,
      expiresAt: f.expires_at,

      burnOnRead: f.burn_on_read,
      starred: !!f.starred,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/d/${f.id}`,
    }))
  })
}, { rateLimit: true, label: "Auth Files GET" })
