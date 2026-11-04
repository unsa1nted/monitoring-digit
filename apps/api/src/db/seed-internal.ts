import '../config.js'
import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, pool } from './index.js'
import { users } from './schema.js'
import { hashPassword } from '../password.js'

const username = 'internal'
try {
  const [existing] = await db.select({ role: users.role }).from(users).where(eq(users.username, username)).limit(1)
  if (existing) {
    if (existing.role !== 'Internal') throw new Error('Username internal sudah digunakan oleh role lain.')
    console.log('Akun internal sudah ada; password tidak diubah.')
  } else {
    const password = process.env.INTERNAL_INITIAL_PASSWORD ?? randomBytes(12).toString('base64url')
    if (password.length < 8 || password.length > 128) throw new Error('Password harus 8–128 karakter.')
    await db.insert(users).values({ username, role: 'Internal', province: null, passwordHash: await hashPassword(password) })
    console.log(`Akun contoh Internal dibuat. Username: ${username}; Password: ${password}`)
  }
} finally {
  await pool.end()
}
