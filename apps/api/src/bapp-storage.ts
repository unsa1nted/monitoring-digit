import { Elysia, t } from 'elysia'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from './db/index.js'
import { bappScans, bappStorages, users } from './db/schema.js'
import { getSessionUser } from './auth.js'
import { recordActivity } from './activity.js'
import { loadSchoolProgress, queueSchoolCount } from './bapp-school-progress.js'

const duplicateScan = sql`exists (select 1 from bapp_scans earlier_scan where earlier_scan.barcode = ${bappScans.barcode} and earlier_scan.id < ${bappScans.id})`
async function scanIsDuplicate(id: number) {
  const [row] = await db.select({ duplicate: sql<number>`${duplicateScan}`.mapWith(Number) }).from(bappScans).where(eq(bappScans.id, id)).limit(1)
  return !!row?.duplicate
}

export const bappStorageRoutes = new Elysia({ prefix: '/api/bapp-fisik/storages' })
  .onBeforeHandle(async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
    if (user.role !== 'Internal') { context.set.status = 403; return { message: 'Penyimpanan Bapp Fisik hanya tersedia untuk akun Internal.' } }
  })
  .get('/', async () => ({ data: await db.select().from(bappStorages).orderBy(desc(bappStorages.id)) }))
  .get('/:id/scans', async (context) => {
    const id = Number(context.params.id)
    const page = Number(context.query.page ?? 1)
    const tab = context.query.tab ?? 'all'
    if (!['all', 'details', 'duplicates'].includes(tab)) { context.set.status = 400; return { message: 'Tab scan tidak valid.' } }
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(page) || page < 1) { context.set.status = 400; return { message: 'Penyimpanan atau halaman tidak valid.' } }
    const [storage] = await db.select().from(bappStorages).where(eq(bappStorages.id, id)).limit(1)
    if (!storage) { context.set.status = 404; return { message: 'Penyimpanan tidak ditemukan.' } }
    const [summary] = await db.select({ totalScans: sql<number>`count(*)`.mapWith(Number), documents: sql<number>`count(distinct ${bappScans.barcode})`.mapWith(Number) }).from(bappScans).where(eq(bappScans.storageId, id))
    const [counts] = await db.select({ duplicates: sql<number>`coalesce(sum(case when ${duplicateScan} then 1 else 0 end), 0)`.mapWith(Number) }).from(bappScans).where(eq(bappScans.storageId, id))
    const tabs = { details: summary.totalScans - counts.duplicates, duplicates: counts.duplicates }
    const totalRows = tab === 'all' ? summary.totalScans : tabs[tab as keyof typeof tabs]
    const data = await db.select({
      id: bappScans.id, barcode: bappScans.barcode, createdAt: bappScans.createdAt,
      validationStatus: bappScans.validationStatus, validationMessage: bappScans.validationMessage,
      schoolName: bappScans.schoolName, npsn: bappScans.npsn, checkedAt: bappScans.checkedAt,
      scannedBy: users.username,
      isDuplicate: sql<number>`${duplicateScan}`.mapWith(value => Boolean(Number(value))),
      occurrences: sql<number>`(select count(*) from bapp_scans other_scan where other_scan.barcode = ${bappScans.barcode})`.mapWith(Number)
    }).from(bappScans).leftJoin(users, eq(users.id, bappScans.scannedBy)).where(and(eq(bappScans.storageId, id), tab === 'duplicates' ? duplicateScan : tab === 'details' ? sql`not ${duplicateScan}` : undefined)).orderBy(desc(bappScans.id)).limit(50).offset((page - 1) * 50)
    const schoolProgress = storage.vendor === 'Hisense' ? await loadSchoolProgress(data.filter(scan => scan.validationStatus === 'valid').map(scan => scan.npsn ?? '')) : new Map()
    return { data: data.map(scan => ({ ...scan, schoolProgress: scan.validationStatus === 'valid' && scan.npsn ? schoolProgress.get(scan.npsn) ?? null : null })), summary, tabs, totalRows, page, pageSize: 50 }
  })
  .post('/:id/scans', async (context) => {
    const storageId = Number(context.params.id)
    const barcode = context.body.barcode.trim()
    if (!Number.isSafeInteger(storageId) || storageId <= 0 || !barcode || /[\x00-\x1f\x7f]/.test(barcode)) { context.set.status = 400; return { message: 'Penyimpanan atau nomor transaksi tidak valid.' } }
    const [storage] = await db.select({ id: bappStorages.id }).from(bappStorages).where(eq(bappStorages.id, storageId)).limit(1)
    if (!storage) { context.set.status = 404; return { message: 'Penyimpanan tidak ditemukan.' } }
    const actor = await getSessionUser(context)
    if (!actor) { context.set.status = 401; return { message: 'Silakan login kembali.' } }
    let id: number
    try {
      const [created] = await db.insert(bappScans).values({ storageId, barcode, requestId: context.body.requestId, scannedBy: actor.id }).$returningId()
      id = created.id
    } catch (error) {
      const cause = error as { code?: string; cause?: { code?: string } }
      if (cause.code !== 'ER_DUP_ENTRY' && cause.cause?.code !== 'ER_DUP_ENTRY') throw error
      const [existing] = await db.select().from(bappScans).where(eq(bappScans.requestId, context.body.requestId)).limit(1)
      if (!existing || existing.storageId !== storageId || existing.barcode !== barcode || existing.scannedBy !== actor.id) { context.set.status = 409; return { message: 'ID permintaan sudah digunakan.' } }
      return { id: existing.id, success: true, isDuplicate: await scanIsDuplicate(existing.id) }
    }
    await recordActivity(context, actor, 'BAPP_SCANNED', `Penyimpanan ${storageId}; scan ${id}`).catch(console.error)
    context.set.status = 201
    return { id, success: true, isDuplicate: await scanIsDuplicate(id) }
  }, { body: t.Object({ barcode: t.String({ minLength: 1, maxLength: 160 }), requestId: t.String({ format: 'uuid' }) }) })
  .post('/:id/scans/:scanId/school-recheck', async (context) => {
    const storageId = Number(context.params.id)
    const scanId = Number(context.params.scanId)
    if (![storageId, scanId].every(value => Number.isSafeInteger(value) && value > 0)) { context.set.status = 400; return { message: 'ID tidak valid.' } }
    const [scan] = await db.select({ npsn: bappScans.npsn, status: bappScans.validationStatus, vendor: bappStorages.vendor }).from(bappScans).innerJoin(bappStorages, eq(bappScans.storageId, bappStorages.id)).where(and(eq(bappScans.id, scanId), eq(bappScans.storageId, storageId))).limit(1)
    if (!scan) { context.set.status = 404; return { message: 'Scan tidak ditemukan.' } }
    if (scan.vendor !== 'Hisense' || scan.status !== 'valid' || !scan.npsn) { context.set.status = 400; return { message: 'NPSN transaksi Hisense belum terverifikasi.' } }
    await queueSchoolCount(scan.npsn, true)
    return { success: true }
  })
  .post('/:id/scans/:scanId/recheck', async (context) => {
    const storageId = Number(context.params.id)
    const scanId = Number(context.params.scanId)
    if (![storageId, scanId].every(value => Number.isSafeInteger(value) && value > 0)) { context.set.status = 400; return { message: 'ID tidak valid.' } }
    const [scan] = await db.select().from(bappScans).where(and(eq(bappScans.id, scanId), eq(bappScans.storageId, storageId))).limit(1)
    if (!scan) { context.set.status = 404; return { message: 'Scan tidak ditemukan.' } }
    if (scan.validationStatus !== 'checking' && scan.validationStatus !== 'pending') {
      await db.update(bappScans).set({ validationStatus: 'pending', validationMessage: null, checkedAt: null, claimedAt: null, schoolName: null, npsn: null }).where(and(eq(bappScans.id, scanId), eq(bappScans.validationStatus, scan.validationStatus)))
    }
    return { success: true }
  })
  .post('/', async (context) => {
    const name = context.body.name.trim()
    if (!name) { context.set.status = 400; return { message: 'Nama label wajib diisi.' } }
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Silakan login kembali.' } }
    let id: number
    try {
      const [created] = await db.insert(bappStorages).values({ name, type: context.body.type, vendor: context.body.vendor, createdBy: user.id }).$returningId()
      id = created.id
    } catch (error) {
      const cause = error as { code?: string; cause?: { code?: string } }
      if (cause.code === 'ER_DUP_ENTRY' || cause.cause?.code === 'ER_DUP_ENTRY') {
        context.set.status = 409
        return { message: 'Nama label sudah tersedia. Gunakan nama lain atau pilih Sudah Tersedia.' }
      }
      throw error
    }
    const [storage] = await db.select().from(bappStorages).where(eq(bappStorages.id, id))
    await recordActivity(context, user, 'BAPP_STORAGE_CREATED', `Penyimpanan ${id}: ${name}`).catch(console.error)
    context.set.status = 201
    return { data: storage, message: 'Label berhasil dibuat.' }
  }, { body: t.Object({ name: t.String({ minLength: 1, maxLength: 120 }), type: t.Union([t.Literal('Dus'), t.Literal('Kontainer'), t.Literal('Penyimpanan Lainnya')]), vendor: t.Union([t.Literal('Hisense'), t.Literal('Skylink'), t.Literal('PLN')]) }) })
