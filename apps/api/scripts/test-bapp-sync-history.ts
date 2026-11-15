import '../src/config.js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import ExcelJS from 'exceljs'
import { desc, inArray } from 'drizzle-orm'
import { db, pool } from '../src/db/index.js'
import { bappHisenseSyncRuns, bappReviewNotifications, masterBapp, petugasReviewer } from '../src/db/schema.js'
import { importBappExcel } from '../src/bapp-review.js'

const suffix = randomUUID().slice(0, 8)
const ids = [`SYNC-${suffix}-1`, `SYNC-${suffix}-2`]
const runIds: number[] = []
try {
  const reviewers = await db.select({ userPetugas: petugasReviewer.userPetugas }).from(petugasReviewer)
  assert.ok(reviewers.length, 'Test requires at least one reviewer')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('BAPP')
  sheet.addRow(['ID Transaksi', 'Resubmit', 'Status Progress', 'NPSN', 'Nama Sekolah', 'Propinsi', 'Kabupaten/Kota', 'Kecamatan', 'Serial Number', 'Reviewer MOE', 'Reviewer MOE Revisi'])
  ids.forEach((id, index) => sheet.addRow([id, false, 'INSTALASI SELESAI', '87654321', `Sekolah Sinkron ${index}`, '', '', '', `SN-${id}`, '', '']))
  const result = await importBappExcel(Buffer.from(await workbook.xlsx.writeBuffer()), () => {}, 'automatic')
  assert.equal(result.allocated, 2)
  const [run] = await db.select().from(bappHisenseSyncRuns).orderBy(desc(bappHisenseSyncRuns.id)).limit(1)
  assert.ok(run)
  runIds.push(run.id)
  assert.equal(run.source, 'automatic')
  assert.equal(run.created, 2)
  assert.equal(run.allocated, 2)
  assert.equal(run.distribution.reduce((sum, item) => sum + item.count, 0), 2)
  const records = await db.select({ reviewer: masterBapp.petugasReviu }).from(masterBapp).where(inArray(masterBapp.idTransaksi, ids))
  for (const item of run.distribution) assert.equal(item.count, records.filter(record => record.reviewer === item.userPetugas).length)
  const repeated = await importBappExcel(Buffer.from(await workbook.xlsx.writeBuffer()), () => {}, 'automatic')
  assert.equal(repeated.allocated, 0)
  const [emptyRun] = await db.select().from(bappHisenseSyncRuns).orderBy(desc(bappHisenseSyncRuns.id)).limit(1)
  assert.ok(emptyRun)
  runIds.push(emptyRun.id)
  assert.equal(emptyRun.created, 0)
  assert.equal(emptyRun.distribution.reduce((sum, item) => sum + item.count, 0), 0)
  console.log('BAPP sync history passed')
} finally {
  await db.delete(bappReviewNotifications).where(inArray(bappReviewNotifications.idTransaksi, ids))
  await db.delete(masterBapp).where(inArray(masterBapp.idTransaksi, ids))
  if (runIds.length) await db.delete(bappHisenseSyncRuns).where(inArray(bappHisenseSyncRuns.id, runIds))
  await pool.end()
}
