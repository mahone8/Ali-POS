import { NextRequest, NextResponse } from 'next/server'
import { checkCredentials } from '@/lib/auth'
import { createSessionToken, setAuthCookie } from '@/lib/auth-token'

// POST /api/auth/login
// Body: { user: string, pass: string }
// On success: sets an httpOnly signed cookie and returns 200 { user }
// On failure: returns 401 { error }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const user = String(body.user ?? '').trim()
    const pass = String(body.pass ?? '')

    if (!user || !pass) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const result = await checkCredentials(user, pass)
    if (!result.ok) {
      // tiny delay to slow down brute force
      await new Promise((r) => setTimeout(r, 300))
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const token = await createSessionToken()
    const res = NextResponse.json({ user: result.user }, { status: 200 })
    setAuthCookie(res, token)
    return res
  } catch (e) {
    console.error('[POST /api/auth/login]', e)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
