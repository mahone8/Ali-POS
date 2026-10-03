/**
 * Seed the initial admin user into the database.
 *
 * Credentials:
 *   username: admin
 *   password: admin321
 *
 * Password is hashed with scrypt (N=16384, r=8, p=1, keyLen=64) — a
 * memory-hard KDF recommended by RFC 7914. The salt is 16 random bytes.
 *
 * Usage:
 *   bun run /home/z/my-project/scripts/seed-admin.ts
 *
 * Idempotent: re-running will update the password if the user already
 * exists, so it's also a "reset password" tool.
 */
import crypto from 'crypto'
import { db } from '../src/lib/db'

const ADMIN_USER = process.env.SEED_ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.SEED_ADMIN_PASS || 'admin321'

function hashPassword(
  password: string
): { salt: string; hash: string } {
  // Generate 16 random bytes for the salt.
  // We pass the raw Buffer (NOT the hex string) to scryptSync so that
  // verifyPassword() can decode the stored hex back to the same bytes.
  const saltBytes = crypto.randomBytes(16)
  const hashBytes = crypto.scryptSync(password, saltBytes, 64)
  return {
    salt: saltBytes.toString('hex'),
    hash: hashBytes.toString('hex'),
  }
}

async function main() {
  const existing = await db.user.findUnique({
    where: { username: ADMIN_USER },
  })

  const { salt, hash } = hashPassword(ADMIN_PASS)

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: hash,
        passwordSalt: salt,
        role: 'admin',
      },
    })
    console.log(`✓ Updated existing admin user "${ADMIN_USER}" with new password.`)
  } else {
    const user = await db.user.create({
      data: {
        username: ADMIN_USER,
        passwordHash: hash,
        passwordSalt: salt,
        role: 'admin',
      },
    })
    console.log(`✓ Created admin user "${user.username}" (id: ${user.id}).`)
  }

  // sanity check: count users
  const total = await db.user.count()
  console.log(`  Total users in DB: ${total}`)
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error('Failed to seed admin user:', e)
    db.$disconnect()
    process.exit(1)
  })
