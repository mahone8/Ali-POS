import { NextRequest, NextResponse } from 'next/server'
import { isRequestAuthenticated } from '@/lib/auth-token'

// Routes that are ALWAYS public (no auth required)
const PUBLIC_API = new Set<string>(['/api/auth/login', '/api/auth/logout', '/api/auth/me'])

// Match all /api/* except the auth routes
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only gate API routes. Pages are gated on the client (the app shell
  // shows a login screen when not authenticated).
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (PUBLIC_API.has(pathname)) {
    return NextResponse.next()
  }

  if (!(await isRequestAuthenticated(req))) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  // Only run middleware for API routes (cheap & scoped).
  matcher: ['/api/:path*'],
}
