import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// ──────────────────────────────────────────────────────────────────────
// Edge-safe session token + cookie helpers.
//
// This file is imported by src/middleware.ts which runs in the Edge
// Runtime. It MUST NOT import or transitively reference any Node-only
// module (e.g. `node:crypto`, `@prisma/client`). All crypto here uses
// the Web Crypto API which works in both Edge and Node runtimes.
//
// Node-only code (DB lookup, scrypt password verify) lives in
// src/lib/auth.ts instead.
// ──────────────────────────────────────────────────────────────────────

const COOKIE_NAME = 'ali_pos_session'
// Token lives 7 days
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

// A long random secret used to sign the session cookie. Generated once
// per server start if not provided (so cookies do not survive restarts).
function generateRandomSecret(): string {
  const arr = new Uint8Array(32)
  globalThis.crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const SESSION_SECRET = process.env.SESSION_SECRET || generateRandomSecret()

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.warn(
    '[auth] WARNING: SESSION_SECRET not set in production. Cookies will not survive server restarts.'
  )
}

// ---- Encoding helpers (Web Crypto API — works in Edge & Node) ----

function toBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sign(payload: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    toBytes(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    toBytes(payload)
  )
  return toHex(new Uint8Array(sigBuf))
}

// Constant-time string compare (avoids timing leaks)
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** Build a signed session token: `${role}.${expiresAt}.${signature}` */
export async function createSessionToken(role: string = 'admin'): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS
  const payload = `${role}.${expiresAt}`
  const sig = await sign(payload)
  return `${payload}.${sig}`
}

/** Verify a token; returns true if valid & not expired. */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [role, expiresAtStr, sig] = parts
  const payload = `${role}.${expiresAtStr}`
  const expected = await sign(payload)
  if (!constantTimeEqual(sig, expected)) return false
  if (role !== 'admin') return false
  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt)) return false
  if (expiresAt * 1000 < Date.now()) return false
  return true
}

/** Server-side: read & verify the session cookie from the current request. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return await verifySessionToken(token)
}

/** Middleware helper: read cookie from a NextRequest and verify. */
export async function isRequestAuthenticated(
  req: NextRequest
): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return await verifySessionToken(token)
}

/** Set the session cookie on a response (login). */
export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  })
}

/** Clear the session cookie (logout). */
export function clearAuthCookie(res: NextResponse) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
}

export const AUTH_COOKIE_NAME = COOKIE_NAME
