import { inArray, sql } from 'drizzle-orm'
import { db } from './db/index.js'
import { schools } from './db/schema.js'
import { provinceNames } from '../../../shared/province-names.js'
import { provinceKey } from './province-statistics.js'
import type { AuthUser } from './auth.js'

export function canonicalProvince(value: string | null | undefined) {
  if (!value?.trim()) return null
  return provinceNames.find(name => provinceKey(name) === provinceKey(value)) ?? null
}

// Resolve spelling aliases against database values, then filter with an exact IN.
// An absent or unrecognized Dinas scope never means unrestricted access.
export async function schoolScope(user: AuthUser) {
  if (user.role === 'Admin') return undefined
  const province = canonicalProvince(user.province)
  if (!province) return sql`false`
  const names = await db.selectDistinct({ name: schools.provinsi }).from(schools)
  const matches = names.filter(row => provinceKey(row.name) === provinceKey(province)).map(row => row.name)
  return matches.length ? inArray(schools.provinsi, matches) : sql`false`
}
