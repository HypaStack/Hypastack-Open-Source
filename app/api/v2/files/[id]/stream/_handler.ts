import { NextRequest, NextResponse } from "next/server"
import { isFileValid } from "@/lib/file-model"
import { getR2Client, getBucketName, buildContentDisposition } from "@/lib/r2"
import { verifyDownloadRateLimit } from "@/lib/rate-limit"
import { createDecryptStream } from "@/lib/security/zero-trust"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { Readable } from "stream"

export async function handleStreamGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let fileId: string | null = null

  try {
    const { id } = await params
    fileId = id

    const rateLimit = await verifyDownloadRateLimit('anonymous')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached, try again later", retryAfter: rateLimit.resetInSeconds },
        { status: 429 }
      )
    }

    const { valid, record } = await isFileValid(id)
    if (!record) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    if (!valid) {
      return NextResponse.json({ error: "File has expired" }, { status: 410 })
    }

    // Unencrypted files have no business going through this proxy — bounce
    // them back to the share page so they go through /api/download/[id].
    if (!record.encryption_iv || !record.encryption_auth_tag) {
      return NextResponse.redirect(new URL(`/d/${id}`, request.url), 303)
    }

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: record.r2_key,
    })

    const response = await getR2Client().send(command)
    if (!response.Body) {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 })
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
        'Content-Disposition': buildContentDisposition(record.original_name),
        // GCM ciphertext length == plaintext length (auth tag is stored separately).
        'Content-Length': record.file_size.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error(`[DownloadProxy] Error for file ${fileId}:`, error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
