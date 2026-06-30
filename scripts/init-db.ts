import { initDatabase } from '../lib/data/db'

async function main() {
  console.log('Initializing database...')
  try {
    await initDatabase()
    console.log('Database initialized successfully')
    process.exit(0)
  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  }
}

main()
