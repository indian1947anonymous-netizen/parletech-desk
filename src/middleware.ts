import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/api/auth', '/api/email']

// Routes that require auth
const protectedRoutes = ['/dashboard', '/tickets', '/customers', '/agents', '/assets', '/licenses', '/knowledge-base', '/reports', '/settings', '/onboarding', '/offboarding']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and static files
  if (
    publicRoutes.some(route => pathname.startsWith(route)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Determine public origin to prevent any reverse proxy localhost redirects
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const host = forwardedHost || request.headers.get('host') || ''
  const isProd = process.env.NODE_ENV === 'production'
  const origin = (isProd && (host.includes('localhost') || host.includes('10000') || !host))
    ? (process.env.AUTH_URL || 'https://parletech-desk.onrender.com')
    : (host ? `${forwardedProto}://${host}` : (process.env.AUTH_URL || 'http://localhost:3000'))

  // Check auth for protected routes
  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Root redirect to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
