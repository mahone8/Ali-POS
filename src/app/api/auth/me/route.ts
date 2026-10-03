import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth-token'

// GET /api/auth/me - check if currently authenticated
// Note: the session token itself only encodes role + expiry, not the
// username, so we return "admin" as a stable role label. The actual
// username lives in the DB and is verified only at login time.
export async function GET() {
  const ok = await isAuthenticated()
  if (!ok) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  return NextResponse.json({ authenticated: true, user: 'admin' })
}
