import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { isFileValid } from "@/lib/file-model"
import { getR2Client, getBucketName, buildContentDisposition } from "@/lib/r2"
import { verifyDownloadRateLimit } from "@/lib/rate-limit"
import { createDecryptStream } from "@/lib/security/zero-trust"
import { decryptFilename } from "@/lib/filename-crypto"
import { getHashedIp } from "@/lib/ip"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { Readable } from "stream"
import { API_ERRORS } from "@/constants"

export async function handleStreamGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let fileId: string | null = null

  try {
    const { id } = await params
    fileId = id

    // Use the shared hardened IP helper (prefers cf-connecting-ip and only
    // trusts the configured number of proxy hops in x-forwarded-for) so this
    // throttle can't be bypassed by spoofing the left-most XFF entry.
    const hashedIp = getHashedIp(request)

    const rateLimit = await verifyDownloadRateLimit(hashedIp)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: API_ERRORS.TOO_MANY_REQUESTS, retryAfter: rateLimit.resetInSeconds },
        { status: 429 }
      )
    }

    const { valid, record } = await isFileValid(id)
    if (!record) {
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }
    if (!valid) {
        return apiError(410, API_ERRORS.GONE, "410 File Expired")
    }

    // bounce
    if (!record.encryption_iv || !record.encryption_auth_tag) {
      return NextResponse.redirect(new URL(`/d/${id}`, request.url), 303)
    }

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: record.r2_key,
    })

    const response = await getR2Client().send(command)
    if (!response.Body) {
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    const s3Stream = response.Body as Readable
    const decipher = createDecryptStream(
      record.encryption_iv,
      record.encryption_auth_tag
    )

    // Propagate R2 read errors into the decipher so the response stream errors
    // out instead of hanging.
    s3Stream.on('error', (err) => {
      console.error(`[DownloadProxy] R2 stream error for ${id}:`, err)
      decipher.destroy(err)
    })

    const webStream = Readable.toWeb(s3Stream.pipe(decipher)) as unknown as ReadableStream<Uint8Array>


    return new NextResponse(webStream, {
      headers: {
        'Content-Type': record.content_type || 'application/octet-stream',
        'Content-Disposition': buildContentDisposition(decryptFilename(record.custom_filename || record.original_name)),
        'Content-Length': record.file_size.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error(`[DownloadProxy] Error for file ${fileId}:`, error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Download Failed")
  }
}
