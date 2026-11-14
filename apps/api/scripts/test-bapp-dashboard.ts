import '../src/config.js'
import assert from 'node:assert/strict'
import { and, eq, sql } from 'drizzle-orm'
import { loadBappDashboard } from '../src/bapp-review.js'
import { db, pool } from '../src/db/index.js'
import { masterBapp } from '../src/db/schema.js'

try {
  const global = await loadBappDashboard()
  const [{ expected }] = await db.select({ expected: sql<number>`count(*)`.mapWith(Number) }).from(masterBapp)
    .where(eq(masterBapp.statusProgress, 'INSTALASI SELESAI'))
  assert.equal(global.summary.perluDireviu, expected)
  const [{ expectedRejected }] = await db.select({ expectedRejected: sql<number>`count(*)`.mapWith(Number) }).from(masterBapp)
    .where(sql`${masterBapp.hasilAkhirReviu} = 'Tidak Sesuai' or ${masterBapp.statusProgress} = 'REVISI'`)
  assert.equal(global.summary.totalDitolakRevisi, expectedRejected)
  for (const reviewer of global.reviewers) {
    assert.ok(reviewer.belumDiperiksa <= reviewer.alokasi)
    assert.ok(reviewer.diterima <= reviewer.sudahDiperiksa)
    assert.ok(reviewer.ditolak <= reviewer.alokasi)
    assert.ok(reviewer.ditolak + reviewer.sedangRevisi <= reviewer.alokasi)
  }
  for (let index = 1; index < global.reviewers.length; index++) {
    const before = global.reviewers[index - 1]
    const after = global.reviewers[index]
    assert.ok(before.sudahDiperiksa >= after.sudahDiperiksa)
  }
  const reviewer = global.reviewers.find(row => row.username === 'aprilia') ?? global.reviewers.find(row => row.alokasi > 0)
  if (reviewer) {
    const [{ expectedCount }] = await db.select({ expectedCount: sql<number>`count(*)`.mapWith(Number) }).from(masterBapp).where(eq(masterBapp.petugasReviu, reviewer.username))
    assert.equal(reviewer.alokasi, expectedCount)
    const [[{ rejected }], [{ revising }]] = await Promise.all([
      db.select({ rejected: sql<number>`count(*)`.mapWith(Number) }).from(masterBapp).where(and(eq(masterBapp.petugasReviu, reviewer.username), sql`${masterBapp.hasilAkhirReviu} = 'Tidak Sesuai' and (${masterBapp.statusProgress} <> 'REVISI' or ${masterBapp.statusProgress} is null)`)),
      db.select({ revising: sql<number>`count(*)`.mapWith(Number) }).from(masterBapp).where(and(eq(masterBapp.petugasReviu, reviewer.username), eq(masterBapp.statusProgress, 'REVISI')))
    ])
    assert.equal(reviewer.ditolak, rejected)
    assert.equal(reviewer.sedangRevisi, revising)
    const [{ pending }] = await db.select({ pending: sql<number>`count(*)`.mapWith(Number) }).from(masterBapp)
      .where(and(eq(masterBapp.petugasReviu, reviewer.username), eq(masterBapp.sudahAdaRevisi, 'Tidak'), eq(masterBapp.statusProgress, 'INSTALASI SELESAI')))
    assert.equal(reviewer.belumDiperiksa, pending)
    const mine = await loadBappDashboard(reviewer.username)
    assert.equal(mine.reviewers.length, 0)
    const [{ mineExpected }] = await db.select({ mineExpected: sql<number>`count(*)`.mapWith(Number) }).from(masterBapp)
      .where(and(eq(masterBapp.petugasReviu, reviewer.username), eq(masterBapp.statusProgress, 'INSTALASI SELESAI')))
    assert.equal(mine.summary.perluDireviu, mineExpected)
  }
  console.log('BAPP dashboard passed')
} finally {
  await pool.end()
}
