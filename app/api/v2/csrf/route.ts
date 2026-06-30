import { NextResponse } from 'next/server'
import { setCsrfCookie } from '@/lib/security/security'

export async function GET() {
  const token = await setCsrfCookie()
  return NextResponse.json({ token })
}

export const dynamic = 'force-dynamic'
