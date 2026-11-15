import '../src/config.js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import ExcelJS from 'exceljs'
import { eq } from 'drizzle-orm'
import { db, pool } from '../src/db/index.js'
import { activityLogs, bappReviewNotifications, masterBapp, users } from '../src/db/schema.js'
import { hashPassword } from '../src/password.js'

const suffix = randomUUID().slice(0, 8)
const username = `notify_${suffix}`
const adminUsername = `notify_admin_${suffix}`
const idTransaksi = `NOTIFY-${suffix}`
const importedId = `NOTIFY-IMPORT-${suffix}`
const revisionId = `NOTIFY-REVISION-${suffix}`
const password = randomUUID()
const base = process.env.TEST_API_ORIGIN ?? 'http://localhost:4001'
try {
  await db.insert(users).values({ username, role: 'Internal', passwordHash: await hashPassword(password) })
  await db.insert(bappReviewNotifications).values({ idTransaksi, userPetugas: username, namaSekolah: 'Sekolah Uji', npsn: '12345678' })
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie')!.split(';')[0]
  const list = await fetch(`${base}/api/bapp-review/notifications`, { headers: { cookie } })
  assert.equal(list.status, 200)
  const first = await list.json() as { notifications: Array<{ id: number; idTransaksi: string; namaSekolah: string }> }
  assert.deepEqual(first.notifications.map(item => [item.idTransaksi, item.namaSekolah]), [[idTransaksi, 'Sekolah Uji']])
  const read = await fetch(`${base}/api/bapp-review/notifications/read`, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [first.notifications[0]!.id] }) })
  assert.equal(read.status, 200)
  const after = await fetch(`${base}/api/bapp-review/notifications`, { headers: { cookie } })
  assert.deepEqual((await after.json() as { notifications: unknown[] }).notifications, [])
  await db.insert(users).values({ username: adminUsername, role: 'Admin', passwordHash: await hashPassword(password) })
  const adminLogin = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: adminUsername, password }) })
  assert.equal(adminLogin.status, 200)
  const adminCookie = adminLogin.headers.get('set-cookie')!.split(';')[0]
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('BAPP')
  sheet.addRow(['ID Transaksi', 'Resubmit', 'Status Progress', 'NPSN', 'Nama Sekolah', 'Propinsi', 'Kabupaten/Kota', 'Kecamatan', 'Serial Number', 'Reviewer MOE', 'Reviewer MOE Revisi'])
  sheet.addRow([importedId, false, 'INSTALASI SELESAI', '87654321', 'Sekolah Impor Uji', '', '', '', `SN-${suffix}`, '', ''])
  sheet.addRow([revisionId, true, 'INSTALASI SELESAI', '87654322', 'Sekolah Revisi Uji', '', '', '', `REV-${suffix}`, '', 'reviewer.revisi'])
  const form = new FormData()
  form.append('file', new File([await workbook.xlsx.writeBuffer() as BlobPart], 'bapp.xlsx'))
  const upload = () => fetch(`${base}/api/admin/bapp-review/import`, { method: 'POST', headers: { cookie: adminCookie }, body: form })
  const firstImport = await upload()
  assert.equal(firstImport.status, 200, await firstImport.clone().text())
  assert.deepEqual(await firstImport.json(), { success: true, created: 2, updated: 0, allocated: 1, skippedStatus: 0, skippedDuplicate: 0 })
  const secondImport = await upload()
  assert.equal(secondImport.status, 200, await secondImport.clone().text())
  assert.equal(((await secondImport.json()) as { created: number }).created, 0)
  const [assigned] = await db.select({ reviewer: masterBapp.petugasReviu }).from(masterBapp).where(eq(masterBapp.idTransaksi, importedId))
  const notifications = await db.select({ reviewer: bappReviewNotifications.userPetugas, school: bappReviewNotifications.namaSekolah }).from(bappReviewNotifications).where(eq(bappReviewNotifications.idTransaksi, importedId))
  assert.deepEqual(notifications, [{ reviewer: assigned!.reviewer, school: 'Sekolah Impor Uji' }])
  assert.deepEqual(await db.select().from(bappReviewNotifications).where(eq(bappReviewNotifications.idTransaksi, revisionId)), [])
  await db.update(masterBapp).set({ statusProgress: 'REVISI', hasilAkhirReviu: 'Tidak Sesuai', petugasReviu: username, fotoBapp1: 'Tidak' }).where(eq(masterBapp.idTransaksi, revisionId))
  const revisionImport = await upload()
  assert.equal(revisionImport.status, 200, await revisionImport.clone().text())
  const [revised] = await db.select({ status: masterBapp.statusProgress, result: masterBapp.hasilAkhirReviu, reviewer: masterBapp.petugasReviu, fotoBapp1: masterBapp.fotoBapp1 }).from(masterBapp).where(eq(masterBapp.idTransaksi, revisionId))
  assert.deepEqual(revised, { status: 'INSTALASI SELESAI', result: null, reviewer: username, fotoBapp1: null })
  const [revisionNotification] = await db.select({ reviewer: bappReviewNotifications.userPetugas, readAt: bappReviewNotifications.readAt }).from(bappReviewNotifications).where(eq(bappReviewNotifications.idTransaksi, revisionId))
  assert.deepEqual(revisionNotification, { reviewer: username, readAt: null })
  const revisionList = await fetch(`${base}/api/bapp-review/notifications`, { headers: { cookie } })
  const revisionResult = await revisionList.json() as { notifications: Array<{ idTransaksi: string; isRevision: boolean }> }
  assert.equal(revisionResult.notifications.find(item => item.idTransaksi === revisionId)?.isRevision, true)
  console.log('BAPP notifications passed')
} finally {
  await db.delete(bappReviewNotifications).where(eq(bappReviewNotifications.idTransaksi, importedId))
  await db.delete(masterBapp).where(eq(masterBapp.idTransaksi, importedId))
  await db.delete(masterBapp).where(eq(masterBapp.idTransaksi, revisionId))
  await db.delete(bappReviewNotifications).where(eq(bappReviewNotifications.idTransaksi, idTransaksi))
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.username, adminUsername))
  if (admin) await db.delete(activityLogs).where(eq(activityLogs.userId, admin.id))
  await db.delete(users).where(eq(users.username, adminUsername))
  await db.delete(users).where(eq(users.username, username))
  await pool.end()
}
