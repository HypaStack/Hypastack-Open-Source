import { withApiKey } from "@/lib/http/v3/withApiKey"
import { v3Ok, v3Error } from "@/lib/http/v3/respond"
import { V3_CODES } from "@/lib/http/v3/codes"
import { loadOwnedFile } from "@/lib/http/v3/owned"
import { toV3File } from "@/lib/http/v3/serialize"
import { getStagingRecord, promoteStagingToFile } from "@/lib/models/fileModel"

export const POST = withApiKey<{ id: string }>(async ({ requestId, userId, params, rate }) => {
  // Idempotent by design: a retry after a dropped response finds the file
  // already promoted and returns it, rather than 404ing on the consumed staging
  // row. Retries are the normal case on flaky networks.
  const existing = await loadOwnedFile(params.id, userId)
  if (existing) return v3Ok(toV3File(existing), requestId, rate)

  const staging = await getStagingRecord(params.id)
  if (!staging || staging.user_id !== userId) {
    return v3Error(V3_CODES.NOT_FOUND, requestId, { rate })
  }

  const promoted = await promoteStagingToFile(params.id)
  if (!promoted) return v3Error(V3_CODES.NOT_FOUND, requestId, { rate })

  const file = await loadOwnedFile(params.id, userId)
  if (!file) {
    return v3Error(V3_CODES.INTERNAL_ERROR, requestId, {
      log: `promote succeeded but file ${params.id} did not read back`,
      rate,
    })
  }

  return v3Ok(toV3File(file), requestId, rate)
}, { scope: "files.write", label: "files complete" })
