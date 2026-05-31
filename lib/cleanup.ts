import { getExpiredFiles, deleteFileRecord, cleanupExpiredStaging } from './file-model'
import { deleteByKey } from './r2'

// Cleanup expired files
export async function cleanupExpiredFiles(): Promise<{
  cleaned: number
  errors: string[]
}> {
  const errors: string[] = []
  let cleaned = 0

  try {
    const expiredFiles = await getExpiredFiles()

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

    if (cleaned > 0 || errors.length > 0) {
      console.error(`[Cleanup] Expired files: cleaned=${cleaned}, errors=${errors.length}`)
    }
  } catch (error: any) {
    console.error('[Cleanup] Fatal error in cleanupExpiredFiles:', error)
    errors.push(`Fatal error: ${error.message}`)
  }

  return { cleaned, errors }
}

// Start scheduled cleanup (runs every hour)
export function startCleanupScheduler(): NodeJS.Timeout {
  // Run immediately on startup
  cleanupExpiredFiles().catch(console.error)
  cleanupStaging().catch(console.error)

  // Then every hour
  return setInterval(() => {
    cleanupExpiredFiles().catch(console.error)
    cleanupStaging().catch(console.error)
  }, 60 * 60 * 1000)
}

// Cleanup orphaned staging records (uploads that never completed)
export async function cleanupStaging(): Promise<{
  cleaned: number
  errors: string[]
}> {
  const result = await cleanupExpiredStaging()
  if (result.cleaned > 0 || result.errors.length > 0) {
    console.error(`[Cleanup] Staging: cleaned=${result.cleaned}, errors=${result.errors.length}`)
  }
  return result
}

// Stop scheduler
export function stopCleanupScheduler(timer: NodeJS.Timeout): void {
  clearInterval(timer)
}
