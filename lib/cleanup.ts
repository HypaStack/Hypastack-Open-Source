import { getExpiredFiles, deleteFileRecord, cleanupExpiredStaging } from './file-model'
import { deleteByKey } from './r2'

// Cleanup expired files
export async function cleanupExpiredFiles(): Promise<{
  cleaned: number
  errors: string[]
}> {
  const errors: string[] = []
  let cleaned = 0
  
  console.error('[Cleanup] Starting cleanup of expired files...')
  
  try {
    const expiredFiles = await getExpiredFiles()
    console.error(`[Cleanup] Found ${expiredFiles.length} expired files`)
    
    for (const file of expiredFiles) {
      try {
        // Delete from R2 using the opaque r2_key
        await deleteByKey(file.r2_key)
        console.error(`[Cleanup] Deleted from R2: ${file.r2_key}`)
        
        // Delete from database
        await deleteFileRecord(file.id)
        console.error(`[Cleanup] Deleted record: ${file.id}`)
        
        cleaned++
      } catch (error: any) {
        const errorMsg = `Failed to delete ${file.id}: ${error.message}`
        console.error(`[Cleanup] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }
    
    console.error(`[Cleanup] Complete. Cleaned: ${cleaned}, Errors: ${errors.length}`)
  } catch (error: any) {
    console.error('[Cleanup] Fatal error:', error)
    errors.push(`Fatal error: ${error.message}`)
  }
  
  return { cleaned, errors }
}

// Start scheduled cleanup (runs every hour)
export function startCleanupScheduler(): NodeJS.Timeout {
  console.error('[Cleanup] Scheduler started - runs every hour')

  // Run immediately on startup
  cleanupExpiredFiles().catch(console.error)
  cleanupStaging().catch(console.error)

  // Then every hour
  return setInterval(() => {
    cleanupExpiredFiles().catch(console.error)
    cleanupStaging().catch(console.error)
  }, 60 * 60 * 1000) // 1 hour
}

// Cleanup expired staging records (orphaned uploads that never completed)
export async function cleanupStaging(): Promise<{
  cleaned: number
  errors: string[]
}> {
  console.error('[Cleanup] Starting cleanup of staging records...')
  
  const result = await cleanupExpiredStaging()
  
  console.error(`[Cleanup] Staging cleanup complete. Cleaned: ${result.cleaned}, Errors: ${result.errors.length}`)
  return result
}

// Stop scheduler
export function stopCleanupScheduler(timer: NodeJS.Timeout): void {
  clearInterval(timer)
  console.error('[Cleanup] Scheduler stopped')
}
