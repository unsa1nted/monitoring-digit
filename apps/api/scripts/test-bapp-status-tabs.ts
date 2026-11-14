import '../src/config.js'
import assert from 'node:assert/strict'
import { and, asc, eq, or, sql } from 'drizzle-orm'
import { db, pool } from '../src/db/index.js'
import { masterBapp } from '../src/db/schema.js'

const [reviewer] = await db.select({ username: masterBapp.petugasReviu }).from(masterBapp).where(sql`trim(${masterBapp.petugasReviu}) <> ''`).limit(1)
if (!reviewer) throw new Error('Isi petugas_reviu pada master_bapp sebelum menjalankan tes ini.')
const scope = eq(masterBapp.petugasReviu, reviewer.username)
const statuses = await db.select({ code: masterBapp.statusProgress, count: sql<number>`count(*)`.mapWith(Number) })
  .from(masterBapp)
  .where(scope).groupBy(masterBapp.statusProgress)
const [{ total }] = await db.select({ total: sql<number>`count(*)`.mapWith(Number) })
  .from(masterBapp).where(scope)
assert.equal(statuses.reduce((sum, row) => sum + row.count, 0), total)
for (const status of statuses.filter(row => row.code)) {
  const page = await db.select({ idTransaksi: masterBapp.idTransaksi }).from(masterBapp)
    .where(and(scope, eq(masterBapp.statusProgress, status.code!))).limit(15)
  assert.ok(page.length <= Math.min(15, status.count))
}
const rejectedOrRevising = or(eq(masterBapp.hasilAkhirReviu, 'Tidak Sesuai'), eq(masterBapp.statusProgress, 'REVISI'))!
const [{ rejectedCount }] = await db.select({ rejectedCount: sql<number>`count(*)`.mapWith(Number) }).from(masterBapp).where(and(scope, rejectedOrRevising))
const rejectedPage = await db.select({ idTransaksi: masterBapp.idTransaksi }).from(masterBapp)
  .where(and(scope, rejectedOrRevising)).orderBy(asc(masterBapp.npsn), asc(masterBapp.idTransaksi)).limit(15)
assert.equal(rejectedPage.length, Math.min(15, rejectedCount))
if (total > 15) {
  const first = await db.select({ idTransaksi: masterBapp.idTransaksi }).from(masterBapp)
    .where(scope).orderBy(asc(masterBapp.npsn), asc(masterBapp.idTransaksi)).limit(15)
  const second = await db.select({ idTransaksi: masterBapp.idTransaksi }).from(masterBapp)
    .where(scope).orderBy(asc(masterBapp.npsn), asc(masterBapp.idTransaksi)).limit(15).offset(15)
  assert.equal(first.length, 15)
  assert.ok(second.length > 0)
  assert.ok(second.every(row => !first.some(previous => previous.idTransaksi === row.idTransaksi)))
}
console.log('BAPP status tabs passed')
await pool.end()
