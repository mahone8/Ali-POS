// ──────────────────────────────────────────────────────────────────────
// Node-only auth: DB lookup + scrypt password verification.
//
// This file is imported only by Node-runtime route handlers (e.g. the
// login route). The Edge middleware imports `auth-token.ts` directly
// so it never transitively pulls in Prisma or `node:crypto`.
// ──────────────────────────────────────────────────────────────────────

/**
 * Verify a password against a stored scrypt hash+salt using Node's
 * `node:crypto` module. Only callable from the Node runtime.
 */
async function verifyPassword(
  password: string,
  saltHex: string,
  expectedHashHex: string
): Promise<boolean> {
  try {
    const { default: crypto } = await import('node:crypto')
    const salt = Buffer.from(saltHex, 'hex')
    const expectedHash = Buffer.from(expectedHashHex, 'hex')
    const hash = crypto.scryptSync(password, salt, expectedHash.length)
    return crypto.timingSafeEqual(hash, expectedHash)
  } catch {
    return false
  }
}

/**
 * Look up the user in the DB and verify their password.
 * Returns the username on success, or `{ ok: false }` on failure.
 *
 * Runs in the Node Runtime only — uses Prisma + `node:crypto`.
 * Do NOT call from middleware.
 */
export async function checkCredentials(
  user: string,
  pass: string
): Promise<{ ok: true; user: string } | { ok: false }> {
  const { db } = await import('@/lib/db')
  const row = await db.user.findUnique({
    where: { username: String(user).trim().toLowerCase() },
    select: { username: true, passwordHash: true, passwordSalt: true, role: true },
  })
  if (!row) return { ok: false }
  if (row.role !== 'admin') return { ok: false }
  if (!(await verifyPassword(pass, row.passwordSalt, row.passwordHash))) {
    return { ok: false }
  }
  return { ok: true, user: row.username }
}
