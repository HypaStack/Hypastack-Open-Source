import { getExpiredFiles, deleteFileRecord, cleanupExpiredStaging } from './file-model'
import { deleteByKey } from './r2'

export async function cleanupExpiredFiles(): Promise<{
  cleaned: number
  errors: string[]
}> {
  const errors: string[] = []
  let cleaned = 0

  try {
    // Process in batches of 500 until no expired files remain
    while (true) {
      const expiredFiles = await getExpiredFiles(500)

      if (expiredFiles.length === 0) break

      for (const file of expiredFiles) {
        try {
          await deleteByKey(file.r2_key)
          await deleteFileRecord(file.id)
          cleaned++
        } catch (error: any) {
          const errorMsg = `Failed to delete ${file.id}: ${error.message}`
          console.error(`[Cleanup] ${errorMsg}`)
          errors.push(errorMsg)
        }
      }
    }

    if (cleaned > 0 || errors.length > 0) {
      console.log(`[Cleanup] Expired files: cleaned=${cleaned}, errors=${errors.length}`)
    }
  } catch (error: any) {
    console.error('[Cleanup] Fatal error in cleanupExpiredFiles:', error)
    errors.push(`Fatal error: ${error.message}`)
  }

  return { cleaned, errors }
}

export function startCleanupScheduler(): NodeJS.Timeout {
  // Run sequentially on startup
  cleanupExpiredFiles()
    .then(() => cleanupStaging())
    .catch(console.error)

  return setInterval(() => {
    cleanupExpiredFiles()
      .then(() => cleanupStaging())
      .catch(console.error)
  }, 60 * 60 * 1000)
}

export async function cleanupStaging(): Promise<{
  cleaned: number
  errors: string[]
}> {
  // cleanupExpiredStaging already batches 500 at a time internally
  const result = await cleanupExpiredStaging()
  if (result.cleaned > 0 || result.errors.length > 0) {
    console.log(`[Cleanup] Staging: cleaned=${result.cleaned}, errors=${result.errors.length}`)
  }
  return result
}

export function stopCleanupScheduler(timer: NodeJS.Timeout): void {
  clearInterval(timer)
}
