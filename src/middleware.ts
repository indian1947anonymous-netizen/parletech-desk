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

  // Check auth for protected routes
  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Root redirect to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
