// Next.js Instrumentation - only runs in Node.js runtime
// Dynamic imports prevent Edge Runtime from loading Node.js modules

let cleanupTimer: NodeJS.Timeout | null = null

export async function register() {
  // Only run on server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.error('[Startup] Initializing application...')

    try {
      // Dynamic imports to avoid Edge Runtime loading these modules
      const { initDatabase } = await import('./lib/db')
      const { startCleanupScheduler } = await import('./lib/cleanup')

      // Initialize database
      await initDatabase()

      // Start cleanup scheduler (runs every hour)
      cleanupTimer = startCleanupScheduler()

      console.error('[Startup] Application initialized successfully')
    } catch (error) {
      console.error('[Startup] Failed to initialize:', error)
    }

    // Cleanup on exit (only in Node.js)
    process.on('SIGINT', () => {
      if (cleanupTimer) clearInterval(cleanupTimer)
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      if (cleanupTimer) clearInterval(cleanupTimer)
      process.exit(0)
    })
  }
}

// Config to ensure this only runs in Node.js runtime
export const config = {
  runtime: 'nodejs',
}
