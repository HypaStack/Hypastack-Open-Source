// Security utilities for CSRF, rate limiting, and download tracking

import crypto from "crypto"
import { cookies } from 'next/headers'

// CSRF Token generation and validation
export function generateCsrfToken(): string {
  const token = Buffer.from(crypto.randomUUID()).toString('base64')
  return token
}

export async function setCsrfCookie(): Promise<string> {
  const token = generateCsrfToken()
  const cookieStore = await cookies()
  cookieStore.set('csrf_token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/',
  })
  return token
}

export async function validateCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get('csrf_token')

  if (!csrfCookie || !token) {
    return false
  }

  // Use Node.js crypto.timingSafeEqual to prevent timing attacks
  const cookieToken = Buffer.from(csrfCookie.value, 'utf8')
  const requestToken = Buffer.from(token, 'utf8')

  if (cookieToken.length !== requestToken.length) {
    return false
  }

  return crypto.timingSafeEqual(cookieToken, requestToken)
}

