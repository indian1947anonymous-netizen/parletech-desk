import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  max: number
}

// Simple in-memory rate limiter (use Redis in production)
const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(config: RateLimitConfig = { windowMs: 60000, max: 100 }) {
  return function checkRateLimit(req: NextRequest): NextResponse | null {
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
    const key = `${ip}:${req.nextUrl.pathname}`
    const now = Date.now()

    const current = requests.get(key)

    if (!current || now > current.resetAt) {
      requests.set(key, { count: 1, resetAt: now + config.windowMs })
      return null
    }

    if (current.count >= config.max) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((current.resetAt - now) / 1000)),
          },
        }
      )
    }

    current.count++
    return null
  }
}

export function sanitizeHtml(input: string): string {
  // Basic XSS prevention — strip script tags and event handlers
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
}

export function validateFileType(mimeType: string): boolean {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/zip',
    'video/mp4',
  ]
  return allowedTypes.includes(mimeType)
}

export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
}
