import { SignJWT, jwtVerify } from 'jose'
import { createHash, randomUUID } from 'node:crypto'
import type { Context } from 'elysia'
import { eq } from 'drizzle-orm'
import { db } from './db/index.js'
import { users } from './db/schema.js'
import { recordActivity } from './activity.js'
import { canonicalProvince } from './province-scope.js'

export { hashPassword, verifyPassword } from './password.js'
const authSecret = process.env.AUTH_SECRET
if (!authSecret || authSecret.length < 32) throw new Error('AUTH_SECRET must be set and at least 32 characters long')
const secret = new TextEncoder().encode(authSecret)
const COOKIE_NAME = 'monitoring_session'
export type Role = 'Admin' | 'Dinas' | 'Internal'
export type AuthUser = { id: number; username: string; role: Role; province: string | null }

export async function createSession(user: AuthUser, verifiedPasswordHash: string) {
  return new SignJWT({ username: user.username, role: user.role, province: user.province, passwordVersion: passwordVersion(verifiedPasswordHash) }).setProtectedHeader({ alg: 'HS256' }).setSubject(String(user.id)).setJti(randomUUID()).setIssuedAt().setExpirationTime('8h').sign(secret)
}

const passwordVersion = (hash: string) => createHash('sha256').update(hash).digest('hex')

export async function getSessionUser(context: Context): Promise<AuthUser | null> {
  context.set.headers['Cache-Control'] = 'no-store'
  const rawToken = context.cookie[COOKIE_NAME]?.value
  const token = typeof rawToken === 'string' ? rawToken : undefined
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    if (!payload.sub || typeof payload.username !== 'string' || (payload.role !== 'Admin' && payload.role !== 'Dinas' && payload.role !== 'Internal')) return null
    const id = Number(payload.sub)
    if (!Number.isSafeInteger(id) || id <= 0) return null
    // Authorization always follows the current account, not stale JWT claims.
    const [account] = await db.select({ id: users.id, username: users.username, role: users.role, province: users.province, passwordHash: users.passwordHash }).from(users).where(eq(users.id, id)).limit(1)
    if (!account || (account.role !== 'Admin' && account.role !== 'Dinas' && account.role !== 'Internal')) return null
    if (payload.passwordVersion !== passwordVersion(account.passwordHash)) return null
    const province = canonicalProvince(account.province)
    if (account.role === 'Dinas' && !province) return null
    const user: AuthUser = { id: account.id, username: account.username, role: account.role, province: account.role === 'Dinas' ? province : null }
    void recordActivity(context, user).catch(() => undefined)
    return user
  } catch { return null }
}

export function setSessionCookie(context: Context, token: string) {
  context.cookie[COOKIE_NAME].set({ value: token, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
}

export function clearSessionCookie(context: Context) { context.cookie[COOKIE_NAME].remove() }

export async function findUser(username: string) {
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1)
  return result[0]
}
