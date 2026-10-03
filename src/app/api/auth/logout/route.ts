import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth-token'

// POST /api/auth/logout - clears the session cookie
export async function POST() {
  const res = NextResponse.json({ success: true })
  clearAuthCookie(res)
  return res
}
