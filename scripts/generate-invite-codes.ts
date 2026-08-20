import crypto from 'node:crypto'
import { ensureDatabase, getPool } from '../lib/data/db'

// node --loader ts-node/esm scripts/generate-invite-codes.ts [count]
async function main() {
  const count = Number(process.argv[2]) || 1
  await ensureDatabase()
  const pool = getPool()

  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(6).toString('hex'))
  }

  for (const code of codes) {
    await pool.query(`INSERT INTO invite_codes (code) VALUES ($1)`, [code])
  }

  console.log(codes.join('\n'))
  process.exit(0)
}

main().catch((error) => {
  console.error('Failed to generate invite codes:', error)
  process.exit(1)
})
