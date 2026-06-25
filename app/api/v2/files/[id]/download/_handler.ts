import { NextRequest, NextResponse } from "next/server"
import {
  isFileValid,
  markFileBurned,
  deleteFileRecord,
} from "@/lib/file-model"
import { checkDownloadRateLimit } from "@/lib/rate-limit"
import { getPresignedDownloadUrl, deleteByKey } from "@/lib/r2"
import { decryptFilename } from "@/lib/filename-crypto"
import { getHashedIp } from "@/lib/ip"
import {
  PRESIGNED_TTL_SECONDS,
  BURN_PRESIGNED_TTL_SECONDS,
  BURN_DELETE_DELAY_MS,
  BURN_DELETE_MAX_RETRIES,
  BURN_DELETE_RETRY_INTERVAL_MS,
  API_ERRORS,
} from "@/constants"

const executeBurnDeletion = async (id: string, r2Key: string) => {
  // Wait for the presigned download URL to expire before deleting the object.
  // This prevents R2 from removing the file while a slow client is still
  // streaming bytes from the presigned URL.
  await new Promise(resolve => setTimeout(resolve, BURN_DELETE_DELAY_MS));

  let attempts = 0;

  while (attempts < BURN_DELETE_MAX_RETRIES) {
    try {
      // Delete the R2 object BEFORE the DB row. If R2 deletion fails, the DB
      // row survives (already marked burned, so it can't be re-downloaded) and
      // the expired-file cron sweep can still find and remove the object later.
      // Deleting the row first would orphan the object beyond cron's reach.
      await deleteByKey(r2Key);
      await deleteFileRecord(id);
      return;
    } catch (error) {
      attempts++
      if (attempts >= BURN_DELETE_MAX_RETRIES) {
        const msg = `[BurnDeletionFailed] completely failed to delete file id: ${id}, key: ${r2Key}, err: ${error instanceof Error ? error.message : String(error)}`;
        if (process.env.NODE_ENV === 'production') {
          try {
            const fs = await import('fs');
            const path = await import('path');
            fs.appendFileSync(path.join(process.cwd(), 'stderr.log'), new Date().toISOString() + " - " + msg + "\n");
          } catch(e) {}
        } else {
          console.error(msg);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, BURN_DELETE_RETRY_INTERVAL_MS));
      }
    }
  }
};

export async function handleDownloadPost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const rateLimit = await checkDownloadRateLimit(getHashedIp(request))
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"Download limit reached"}`);
      return NextResponse.json(
        {
          error: API_ERRORS.TOO_MANY_REQUESTS,
          message: "You've downloaded too many files recently. Please wait a moment.",
          retryAfter: rateLimit.resetInSeconds,
        },
        { status: 429 }
      )
    }

    const { valid, record } = await isFileValid(id)

    if (!record) {
        console.error(`[API Error] 404 Not Found: ${"File not found"}`);
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    if (!valid) {
        console.error(`[API Error] 410 Gone: ${"File has expired"}`);
      return NextResponse.json({ error: API_ERRORS.GONE }, { status: 410 })
    }

    // Atomic burn-mark BEFORE issuing any URL so concurrent requests can't
    // all succeed. markFileBurned uses SELECT ... FOR UPDATE.
    let burned = false
    if (record.burn_on_read === 1) {
      const burnResult = await markFileBurned(id)
      if (!burnResult.success) {
          console.error(`[API Error] 410 Gone: ${"File has already been downloaded"}`);
        return NextResponse.json(
          { error: API_ERRORS.GONE },
          { status: 410 }
        )
      }
      burned = true
    }

    const displayName = decryptFilename(record.custom_filename || record.original_name)
    const originalDisplayName = decryptFilename(record.original_name)

    const isEncrypted = !!(record.encryption_iv && record.encryption_auth_tag)

    const ttl = burned ? BURN_PRESIGNED_TTL_SECONDS : PRESIGNED_TTL_SECONDS

    let downloadUrl: string
    if (isEncrypted) {
      // Legacy encrypted-at-rest fallback (server must decrypt).
      downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/v2/files/${id}/stream`
    } else {
      downloadUrl = await getPresignedDownloadUrl({
        r2Key: record.r2_key,
        originalName: originalDisplayName,
        contentType: record.content_type || 'application/octet-stream',
        expiresIn: ttl,
      })
    }

    if (burned) {
      executeBurnDeletion(id, record.r2_key);
    }


    return NextResponse.json({
      success: true,
      downloadUrl,
      fileName: originalDisplayName,
      burned,
    })
  } catch (error) {
    console.error("[Download] Error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to generate download URL"}`);
    return NextResponse.json(
      { error: API_ERRORS.INTERNAL_SERVER_ERROR },
      { status: 500 }
    )
  }
}
