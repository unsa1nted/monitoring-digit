import { Elysia, t } from 'elysia'
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { db, pool } from './db/index.js'
import { bappHisenseSyncRuns, bappReviewNotifications, bappReviewerAssignments, masterBapp, petugasReviewer } from './db/schema.js'
import { getSessionUser } from './auth.js'
import { recordActivity } from './activity.js'
import { downloadHisenseSmkAllocationExcel, getHisenseSmkPages, getHisenseTransaction, reviewHisenseAllocation, type HisenseTransaction } from './hisense.js'
import { parseBappExcel, parseBappReviewExcel } from './bapp-excel-import.js'
import { bappRejectionReasons } from '../../../shared/bapp-rejection-reasons.js'

const npsnPattern = /^\d{8}$/
const usernamePattern = /^[a-zA-Z0-9_.-]{3,80}$/
export const lockedBappReviewStatuses = new Set(['DISETUJUI', 'SESUAI APIP', 'REVIU APIP'])
const revisionReadyFields = {
  sudahAdaRevisi: 'Ya' as const, statusProgress: 'INSTALASI SELESAI', hasilAkhirReviu: null,
  fotoPlangSekolah: null, fotoBoxPic: null, fotoKelengkapanUnit: null, fotoProsesInstalasi: null,
  fotoKesesuaianSerialNumber: null, fotoTrainingRumahPendidikan: null, fotoBapp1: null, fotoBapp2: null,
  catatanPetugas: null
}
const verdict = t.Union([t.Literal('Ya'), t.Literal('Tidak')])
const draftBody = t.Object({
  fotoPlangSekolah: t.Union([verdict, t.Null()]),
  fotoBoxPic: t.Union([verdict, t.Null()]),
  fotoKelengkapanUnit: t.Union([verdict, t.Null()]),
  fotoProsesInstalasi: t.Union([verdict, t.Null()]),
  fotoKesesuaianSerialNumber: t.Union([verdict, t.Null()]),
  fotoTrainingRumahPendidikan: t.Union([verdict, t.Null()]),
  fotoBapp1: t.Union([verdict, t.Null()]),
  fotoBapp2: t.Union([verdict, t.Null()]),
  catatanPetugas: t.String({ maxLength: 5000 })
})
const reviewBody = t.Object({
  action: t.Union([t.Literal('approve'), t.Literal('reject')]),
  fotoPlangSekolah: verdict,
  fotoBoxPic: verdict,
  fotoKelengkapanUnit: verdict,
  fotoProsesInstalasi: verdict,
  fotoKesesuaianSerialNumber: verdict,
  fotoTrainingRumahPendidikan: verdict,
  fotoBapp1: verdict,
  fotoBapp2: verdict,
  catatanPetugas: t.Optional(t.String({ maxLength: 5000 })),
  rejectionReasons: t.Optional(t.Array(t.String(), { maxItems: 10 })),
  rejectionNote: t.Optional(t.String({ maxLength: 5000 }))
})
type ReviewVerdict = 'Ya' | 'Tidak'
export function finalReviewResult(values: ReviewVerdict[]): 'Sesuai' | 'Tidak Sesuai' {
  return values.includes('Tidak') ? 'Tidak Sesuai' : 'Sesuai'
}
const duplicate = (error: unknown) => {
  const cause = error as { code?: string; cause?: { code?: string } }
  return cause.code === 'ER_DUP_ENTRY' || cause.cause?.code === 'ER_DUP_ENTRY'
}

export function distributeNewBappRows<T extends { idTransaksi: string }>(rows: T[], reviewers: Array<{ userPetugas: string; alokasiPersen: number | null }>) {
  if (!rows.length) return new Map<string, string>()
  if (!reviewers.length) throw new Error('Tambahkan petugas reviewer sebelum mengimpor transaksi baru.')
  const sorted = [...reviewers].sort((a, b) => a.userPetugas.localeCompare(b.userPetugas))
  const fixed = sorted.reduce((sum, reviewer) => sum + (reviewer.alokasiPersen ?? 0), 0)
  const withoutQuota = sorted.filter(reviewer => reviewer.alokasiPersen === null).length
  if (fixed > 100 || (!withoutQuota && fixed !== 100)) throw new Error('Total persentase harus paling banyak 100%; jika semua petugas diatur, total harus 100%.')
  const share = withoutQuota ? (100 - fixed) / withoutQuota : 0
  const quotas = sorted.map(reviewer => {
    const exact = rows.length * (reviewer.alokasiPersen ?? share) / 100
    return { userPetugas: reviewer.userPetugas, count: Math.floor(exact), fraction: exact % 1 }
  })
  let remaining = rows.length - quotas.reduce((sum, quota) => sum + quota.count, 0)
  for (const quota of [...quotas].sort((a, b) => b.fraction - a.fraction || a.userPetugas.localeCompare(b.userPetugas))) {
    if (!remaining) break
    quota.count++
    remaining--
  }
  const assignments = new Map<string, string>()
  const sortedRows = [...rows].sort((a, b) => a.idTransaksi.localeCompare(b.idTransaksi))
  let offset = 0
  for (const quota of quotas) {
    for (const row of sortedRows.slice(offset, offset + quota.count))
      assignments.set(row.idTransaksi, quota.userPetugas)
    offset += quota.count
  }
  return assignments
}

export function prepareAssignments(rows: Array<{ npsn: string; userPetugas: string }>) {
  const seen = new Set<string>()
  return rows.map((row, index) => {
    const npsn = row.npsn.trim()
    const userPetugas = row.userPetugas.trim()
    if (!npsnPattern.test(npsn) || !usernamePattern.test(userPetugas))
      throw new Error(`Baris ${index + 1}: NPSN harus 8 digit dan username petugas harus valid.`)
    if (seen.has(npsn)) throw new Error(`Baris ${index + 1}: NPSN ${npsn} tercantum lebih dari sekali.`)
    seen.add(npsn)
    return { npsn, userPetugas }
  })
}

export function prepareAutoAssignments(records: Array<{ idTransaksi?: string; npsn: string; petugasReviu: string }>, reviewers: Array<{ userPetugas: string }>) {
  const registered = new Map(reviewers.map(reviewer => [reviewer.userPetugas.toLowerCase(), reviewer.userPetugas]))
  const byNpsn = new Map<string, typeof records>()
  for (const record of records) {
    const npsn = record.npsn.trim()
    byNpsn.set(npsn, [...(byNpsn.get(npsn) ?? []), record])
  }
  const rows: Array<{ npsn: string; userPetugas: string }> = []
  const skipped: Array<{ npsn: string; category: 'invalid' | 'conflict' | 'unregistered'; reason: string; sources: Array<{ idTransaksi: string; petugasReviu: string }> }> = []
  let conflicts = 0
  let unregistered = 0
  let invalid = 0
  for (const [npsn, sourceRows] of byNpsn) {
    const usernames = [...new Set(sourceRows.map(row => row.petugasReviu.trim().toLowerCase()))]
    const invalidUsernames = usernames.filter(username => !usernamePattern.test(username))
    let category: 'invalid' | 'conflict' | 'unregistered' | null = null
    let reason = ''
    if (!npsnPattern.test(npsn) || invalidUsernames.length) {
      invalid++
      category = 'invalid'
      reason = !npsnPattern.test(npsn) ? 'NPSN harus 8 digit.' : `Format petugas_reviu tidak valid: ${invalidUsernames.map(username => username || '(kosong)').join(', ')}.`
    } else if (usernames.length > 1) {
      conflicts++
      category = 'conflict'
      reason = 'Satu NPSN memiliki petugas_reviu berbeda.'
    } else if (!registered.has(usernames[0])) {
      unregistered++
      category = 'unregistered'
      reason = `Username ${usernames[0]} belum ada di petugas_reviewer.`
    }
    if (category) {
      skipped.push({ npsn, category, reason, sources: sourceRows.map(row => ({ idTransaksi: row.idTransaksi ?? '', petugasReviu: row.petugasReviu })) })
      continue
    }
    const userPetugas = registered.get(usernames[0])!
    rows.push({ npsn, userPetugas })
  }
  return { rows, conflicts, unregistered, invalid, skipped }
}

export function prepareReviewImportReviewers(rows: Array<{ idTransaksi: string; petugasReviu: string }>, reviewers: Array<{ userPetugas: string; namaPetugas: string }>) {
  const usernames = new Map(reviewers.map(reviewer => [reviewer.userPetugas.trim().toLowerCase(), reviewer.userPetugas]))
  const names = new Map<string, string | null>()
  for (const reviewer of reviewers) {
    const name = reviewer.namaPetugas.trim().toLowerCase()
    if (name) names.set(name, names.has(name) ? null : reviewer.userPetugas)
  }
  const usernamesByTransaction = new Map<string, string>()
  let missing = 0
  let unregistered = 0
  for (const row of rows) {
    const name = row.petugasReviu.trim().toLowerCase()
    if (!name) { missing++; continue }
    const username = usernames.get(name) ?? names.get(name)
    if (!username) { unregistered++; continue }
    usernamesByTransaction.set(row.idTransaksi, username)
  }
  return { usernamesByTransaction, missing, unregistered }
}
async function getAutoAssignments() {
  const [records, reviewers] = await Promise.all([
    db.select({ idTransaksi: masterBapp.idTransaksi, npsn: masterBapp.npsn, petugasReviu: masterBapp.petugasReviu }).from(masterBapp),
    db.select({ userPetugas: petugasReviewer.userPetugas }).from(petugasReviewer)
  ])
  return prepareAutoAssignments(records, reviewers)
}

function transactionFromMaster(review: typeof masterBapp.$inferSelect) {
  return {
    id_transaksi: review.idTransaksi,
    kode_status_progress: review.statusProgress,
    serial_number: review.serialNumber,
    tag_revisi: review.tag,
    npsn_info: {
      npsn: review.npsn,
      nama_sekolah: review.namaSekolah,
      propinsi: review.propinsi,
      kabupaten_kota: review.kabupatenKota,
      kecamatan: review.kecamatan
    }
  }
}

export async function collectHisenseReviewerUpdates(masters: Array<{ idTransaksi: string; petugasReviu: string }>, pages: AsyncIterable<HisenseTransaction[]>) {
  const emptyMasters = masters.filter(row => !row.petugasReviu.trim())
  const current = new Set(emptyMasters.map(row => row.idTransaksi))
  const found = new Set<string>()
  const updates: Array<{ idTransaksi: string; petugasReviu: string }> = []
  let withoutApproval = 0
  let tooLong = 0
  for await (const page of pages) for (const transaction of page) {
    const id = transaction.id_transaksi
    if (!id || !current.has(id) || found.has(id)) continue
    found.add(id)
    const approvedByMoe = typeof transaction.approved_by_moe === 'string' ? transaction.approved_by_moe.trim() : ''
    if (!approvedByMoe) { withoutApproval++; continue }
    if (approvedByMoe.length > 80) { tooLong++; continue }
    updates.push({ idTransaksi: id, petugasReviu: approvedByMoe })
  }
  return { updates, total: masters.length, empty: emptyMasters.length, alreadyFilled: masters.length - emptyMasters.length, withoutApproval, tooLong, notFound: emptyMasters.length - found.size }
}


type BappImportProgress = (percent: number, stage: string) => void
export async function importBappExcel(buffer: Buffer, progress: BappImportProgress = () => {}, source?: 'automatic' | 'manual') {
  progress(45, 'Membaca Excel Hisense')
  const parsed = await parseBappExcel(buffer)
  progress(50, 'Memeriksa transaksi baru')
  const existing = new Map((await db.select({ idTransaksi: masterBapp.idTransaksi, statusProgress: masterBapp.statusProgress, hasilAkhirReviu: masterBapp.hasilAkhirReviu, petugasReviu: masterBapp.petugasReviu }).from(masterBapp)).map(row => [row.idTransaksi, row]))
  const newReviewRows = parsed.rows.filter(row => !existing.has(row.idTransaksi) && row.sudahAdaRevisi === 'Tidak' && row.statusProgress === 'INSTALASI SELESAI')
  const revisionRows = parsed.rows.filter(row => row.statusProgress === 'INSTALASI SELESAI' && (existing.get(row.idTransaksi)?.statusProgress === 'REVISI' || existing.get(row.idTransaksi)?.hasilAkhirReviu === 'Tidak Sesuai'))
  const revisionIds = new Set(revisionRows.map(row => row.idTransaksi))
  const reviewers = await db.select({ userPetugas: petugasReviewer.userPetugas, namaPetugas: petugasReviewer.namaPetugas, alokasiPersen: petugasReviewer.alokasiPersen }).from(petugasReviewer)
  const allocations = distributeNewBappRows(newReviewRows, reviewers)
  const created = parsed.rows.filter(row => !existing.has(row.idTransaksi)).length
  await db.transaction(async tx => {
    for (let index = 0; index < parsed.rows.length; index++) {
      const row = parsed.rows[index]!
      const assignedReviewer = allocations.get(row.idTransaksi)
      const revisionReady = revisionIds.has(row.idTransaksi)
      const keepReviewer = assignedReviewer || revisionReady || (existing.has(row.idTransaksi) && row.sudahAdaRevisi === 'Tidak' && row.statusProgress === 'INSTALASI SELESAI')
      const metadata = {
        sudahAdaRevisi: row.sudahAdaRevisi, statusProgress: row.statusProgress, npsn: row.npsn,
        namaSekolah: row.namaSekolah, propinsi: row.propinsi, kabupatenKota: row.kabupatenKota,
        kecamatan: row.kecamatan, serialNumber: row.serialNumber, tag: null,
        ...(!keepReviewer && row.petugasReviu ? { petugasReviu: row.petugasReviu } : {}),
        ...(revisionReady ? revisionReadyFields : {})
      }
      await tx.insert(masterBapp).values({ idTransaksi: row.idTransaksi, petugasReviu: assignedReviewer ?? row.petugasReviu, ...metadata })
        .onDuplicateKeyUpdate({ set: metadata })
      if (index % 25 === 0 || index === parsed.rows.length - 1) progress(50 + Math.round((index + 1) / parsed.rows.length * 45), `Menyimpan ${index + 1} dari ${parsed.rows.length} transaksi`)
    }
    const assignedRows = newReviewRows.filter(row => allocations.has(row.idTransaksi))
    if (assignedRows.length) await tx.insert(bappReviewNotifications).values(assignedRows.map(row => ({
      idTransaksi: row.idTransaksi, userPetugas: allocations.get(row.idTransaksi)!, namaSekolah: row.namaSekolah, npsn: row.npsn
    }))).onDuplicateKeyUpdate({ set: { idTransaksi: sql`${bappReviewNotifications.idTransaksi}` } })
    for (const row of revisionRows) {
      const userPetugas = existing.get(row.idTransaksi)!.petugasReviu
      await tx.insert(bappReviewNotifications).values({ idTransaksi: row.idTransaksi, userPetugas, namaSekolah: row.namaSekolah, npsn: row.npsn })
        .onDuplicateKeyUpdate({ set: { userPetugas, namaSekolah: row.namaSekolah, npsn: row.npsn, readAt: null, createdAt: new Date() } })
    }
    if (source) {
      const counts = new Map<string, number>()
      for (const username of allocations.values()) counts.set(username, (counts.get(username) ?? 0) + 1)
      await tx.insert(bappHisenseSyncRuns).values({
        source, created, updated: parsed.rows.length - created, allocated: allocations.size,
        distribution: reviewers.map(reviewer => ({ userPetugas: reviewer.userPetugas, namaPetugas: reviewer.namaPetugas, count: counts.get(reviewer.userPetugas) ?? 0 }))
      })
    }
  })
  progress(100, 'Sinkronisasi selesai')
  return { success: true, created, updated: parsed.rows.length - created, allocated: allocations.size, skippedStatus: parsed.skippedStatus, skippedDuplicate: parsed.skippedDuplicate }
}

type HisenseSyncJob = { id: string; status: 'running' | 'done' | 'error'; percent: number; stage: string; result?: Awaited<ReturnType<typeof importBappExcel>>; message?: string }
let hisenseSyncJob: HisenseSyncJob | null = null

export async function startHisenseSyncJob(source: 'automatic' | 'manual' = 'automatic', onSuccess?: (result: Awaited<ReturnType<typeof importBappExcel>>) => Promise<void>) {
  if (hisenseSyncJob?.status === 'running') return null
  const connection = await pool.getConnection()
  try {
    const [rows] = await connection.query('SELECT GET_LOCK(?, 0) AS acquired', ['monitoring_digit_bapp_hisense_sync'])
    if (!(rows as Array<{ acquired: number }>)[0]?.acquired) { connection.release(); return null }
  } catch (error) { connection.release(); throw error }
  const job: HisenseSyncJob = { id: crypto.randomUUID(), status: 'running', percent: 1, stage: 'Menghubungi Hisense' }
  hisenseSyncJob = job
  void (async () => {
    try {
      const buffer = await downloadHisenseSmkAllocationExcel((received, total) => {
        job.percent = total ? Math.min(40, Math.round(received / total * 40)) : 5
        job.stage = `Mengunduh Excel Hisense${total ? ` (${Math.round(received / total * 100)}%)` : ''}`
      })
      job.result = await importBappExcel(buffer, (percent, stage) => { job.percent = percent; job.stage = stage }, source)
      job.status = 'done'
      if (onSuccess) await onSuccess(job.result).catch(console.error)
    } catch (error) {
      job.status = 'error'
      job.stage = 'Sinkronisasi gagal'
      job.message = error instanceof Error ? error.message : 'Sinkronisasi Hisense gagal.'
      console.error('Sinkronisasi BAPP Hisense gagal:', error)
    } finally {
      await connection.query('SELECT RELEASE_LOCK(?)', ['monitoring_digit_bapp_hisense_sync']).catch(console.error)
      connection.release()
    }
  })()
  return job
}

export const adminBappReview = new Elysia({ prefix: '/api/admin/bapp-review' })
  .onBeforeHandle(async context => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
    if (user.role !== 'Admin') { context.set.status = 403; return { message: 'Hanya admin yang dapat mengelola assignment BAPP.' } }
  })
.get('/', async () => ({ reviewers: await db.select().from(petugasReviewer).orderBy(asc(petugasReviewer.userPetugas)) }))
  .post('/reviewers', async context => {
    const namaPetugas = context.body.namaPetugas.trim()
    const userPetugas = context.body.userPetugas.trim()
    if (!namaPetugas || !usernamePattern.test(userPetugas)) {
      context.set.status = 400
      return { message: 'Isi nama dan username petugas yang valid.' }
    }
    try {
      await db.insert(petugasReviewer).values({ namaPetugas, userPetugas })
    } catch (error) {
      if (!duplicate(error)) throw error
      context.set.status = 409
      return { message: 'Username petugas sudah terdaftar.' }
    }
    const actor = await getSessionUser(context)
    if (actor) await recordActivity(context, actor, 'BAPP_REVIEWER_CREATED', `Petugas: ${userPetugas}`).catch(console.error)
    context.set.status = 201
    return { success: true }
  }, { body: t.Object({ namaPetugas: t.String({ minLength: 1, maxLength: 120 }), userPetugas: t.String({ minLength: 3, maxLength: 80 }) }) })
.patch('/reviewers/:id/allocation', async context => {
  const id = Number(context.params.id)
  const percent = context.body.alokasiPersen
  if (!Number.isSafeInteger(id) || id < 1 || (percent !== null && (!Number.isInteger(percent) || percent < 0 || percent > 100))) {
    context.set.status = 400
    return { message: 'Persentase harus bilangan bulat 0 sampai 100, atau kosong untuk pembagian rata.' }
  }
  const reviewers = await db.select({ id: petugasReviewer.id, alokasiPersen: petugasReviewer.alokasiPersen }).from(petugasReviewer)
  if (!reviewers.some(reviewer => reviewer.id === id)) { context.set.status = 404; return { message: 'Petugas reviewer tidak ditemukan.' } }
  const total = reviewers.reduce((sum, reviewer) => sum + (reviewer.id === id ? percent ?? 0 : reviewer.alokasiPersen ?? 0), 0)
  if (total > 100) { context.set.status = 400; return { message: 'Total persentase petugas tidak boleh melebihi 100%.' } }
  await db.update(petugasReviewer).set({ alokasiPersen: percent }).where(eq(petugasReviewer.id, id))
  return { success: true }
}, { body: t.Object({ alokasiPersen: t.Union([t.Number(), t.Null()]) }) })
  .post('/reviewers/sync-hisense', async context => {
    const masters = await db.select({ idTransaksi: masterBapp.idTransaksi, petugasReviu: masterBapp.petugasReviu }).from(masterBapp)
    const empty = masters.filter(row => !row.petugasReviu.trim())
    if (!empty.length) return { success: true, total: masters.length, empty: 0, alreadyFilled: masters.length, updated: 0, withoutApproval: 0, tooLong: 0, notFound: 0 }
    let result: Awaited<ReturnType<typeof collectHisenseReviewerUpdates>>
    try {
      result = await collectHisenseReviewerUpdates(empty, getHisenseSmkPages())
    } catch (error) {
      context.set.status = 502
      return { message: error instanceof Error ? error.message : 'Data Hisense belum dapat dimuat.' }
    }
    let updated = 0
    if (result.updates.length) await db.transaction(async tx => {
      for (const row of result.updates) {
        const [change] = await tx.update(masterBapp).set({ petugasReviu: row.petugasReviu })
          .where(and(eq(masterBapp.idTransaksi, row.idTransaksi), sql`trim(${masterBapp.petugasReviu}) = ''`))
        updated += change.affectedRows
      }
    })
    const actor = await getSessionUser(context)
    if (actor) await recordActivity(context, actor, 'BAPP_REVIEWER_HISENSE_SYNCED', `${updated} transaksi`).catch(console.error)
    const { updates, ...summary } = result
    return { success: true, ...summary, total: masters.length, alreadyFilled: masters.length - empty.length, updated }
  })
  .post('/import', async context => {
    const file = context.body.file
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 20 * 1024 * 1024) {
      context.set.status = 400
      return { message: 'Unggah file .xlsx maksimal 20 MB.' }
    }
  try {
    const result = await importBappExcel(Buffer.from(await file.arrayBuffer()))
    const actor = await getSessionUser(context)
    if (actor) await recordActivity(context, actor, 'BAPP_EXCEL_IMPORTED', `${result.created + result.updated} transaksi`).catch(console.error)
    return result
  } catch (error) {
    context.set.status = 400
    return { message: error instanceof Error ? error.message : 'File Excel tidak valid.' }
  }
  }, { body: t.Object({ file: t.File() }) })
.get('/sync-hisense', () => hisenseSyncJob)
.get('/sync-hisense/history', async () => ({ runs: await db.select().from(bappHisenseSyncRuns).orderBy(desc(bappHisenseSyncRuns.id)).limit(20) }))
.post('/sync-hisense', async context => {
  const actor = await getSessionUser(context)
  const job = await startHisenseSyncJob('manual', async result => {
    if (actor) await recordActivity(context, actor, 'BAPP_HISENSE_SYNCED', `${result.created + result.updated} transaksi`)
  })
  if (!job) { context.set.status = 409; return { message: 'Sinkronisasi Hisense sedang berjalan.' } }
  return job
})
.post('/import-reviews', async context => {
  const file = context.body.file
  if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 20 * 1024 * 1024) {
    context.set.status = 400
    return { message: 'Unggah file .xlsx maksimal 20 MB.' }
  }
  let parsed: Awaited<ReturnType<typeof parseBappReviewExcel>>
  try { parsed = await parseBappReviewExcel(Buffer.from(await file.arrayBuffer())) }
  catch (error) {
    context.set.status = 400
    return { message: error instanceof Error ? error.message : 'File Excel tidak valid.' }
  }
  const masters = await db.select({ idTransaksi: masterBapp.idTransaksi, serialNumber: masterBapp.serialNumber, npsn: masterBapp.npsn, petugasReviu: masterBapp.petugasReviu }).from(masterBapp)
  const bySerial = new Map<string, typeof masters>()
  for (const master of masters) {
    const serial = master.serialNumber?.trim().toUpperCase()
    if (serial) bySerial.set(serial, [...(bySerial.get(serial) ?? []), master])
  }
  let unmatched = 0
  let ambiguous = 0
  const matched = parsed.rows.flatMap(row => {
    const candidates = bySerial.get(row.serialNumber.toUpperCase()) ?? []
    if (!candidates.length) { unmatched++; return [] }
    const master = candidates.length === 1 ? candidates[0] : candidates.find(candidate => candidate.idTransaksi === row.idTransaksi)
    if (!master) { ambiguous++; return [] }
    return [{ ...row, idTransaksi: master.idTransaksi, serialNumber: master.serialNumber!, npsn: master.npsn, previousPetugasReviu: master.petugasReviu }]
  })
  if (new Set(matched.map(row => row.idTransaksi)).size !== matched.length) {
    context.set.status = 400
    return { message: 'File Excel memuat lebih dari satu baris untuk transaksi yang sama.' }
  }
  const reviewers = await db.select({ userPetugas: petugasReviewer.userPetugas, namaPetugas: petugasReviewer.namaPetugas }).from(petugasReviewer)
    const reviewerResult = prepareReviewImportReviewers(matched, reviewers)
  const updatedReviewer = matched.filter(row => {
      const username = reviewerResult.usernamesByTransaction.get(row.idTransaksi)
    return username && row.previousPetugasReviu !== username
  }).length
  await db.transaction(async tx => {
    for (const row of matched) {
        const username = reviewerResult.usernamesByTransaction.get(row.idTransaksi)
      await tx.update(masterBapp).set({ ...row.photos, hasilAkhirReviu: row.hasilAkhirReviu, ...(username ? { petugasReviu: username } : {}) })
        .where(and(eq(masterBapp.idTransaksi, row.idTransaksi), eq(masterBapp.serialNumber, row.serialNumber)))
    }
  })
  const actor = await getSessionUser(context)
  if (actor) await recordActivity(context, actor, 'BAPP_REVIEWS_IMPORTED', `${matched.length} hasil reviu diimpor`).catch(console.error)
    return { success: true, updated: matched.length, updatedReviewer, missingReviewer: reviewerResult.missing, unregisteredReviewer: reviewerResult.unregistered, unmatched, ambiguous, skippedDuplicate: parsed.skippedDuplicate }
}, { body: t.Object({ file: t.File() }) })
  .post('/assignments', async context => {
    let rows: ReturnType<typeof prepareAssignments>
    try { rows = prepareAssignments(context.body.rows) }
    catch (error) {
      context.set.status = 400
      return { message: error instanceof Error ? error.message : 'Format assignment tidak valid.' }
    }
    const usernames = [...new Set(rows.map(row => row.userPetugas))]
    const reviewers = await db.select({ userPetugas: petugasReviewer.userPetugas }).from(petugasReviewer).where(inArray(petugasReviewer.userPetugas, usernames))
    const registered = new Set(reviewers.map(reviewer => reviewer.userPetugas.toLowerCase()))
    const missing = usernames.find(username => !registered.has(username.toLowerCase()))
    if (missing) { context.set.status = 404; return { message: `Petugas reviewer ${missing} belum terdaftar.` } }
    await db.transaction(async tx => {
      for (const row of rows)
        await tx.insert(bappReviewerAssignments).values(row).onDuplicateKeyUpdate({ set: { userPetugas: row.userPetugas } })
    })
    const actor = await getSessionUser(context)
    if (actor) await recordActivity(context, actor, 'BAPP_NPSN_ASSIGNED', `${rows.length} NPSN`).catch(console.error)
    return { success: true, count: rows.length }
  }, { body: t.Object({ rows: t.Array(t.Object({ npsn: t.String(), userPetugas: t.String() }), { minItems: 1, maxItems: 100 }) }) })
  .get('/assignments/auto/preview', async () => {
    const { rows, skipped, conflicts, unregistered, invalid } = await getAutoAssignments()
    return { count: rows.length, conflicts, unregistered, invalid, skipped }
  })
  .post('/assignments/auto', async context => {
    const result = await getAutoAssignments()
    if (result.rows.length) await db.transaction(async tx => {
      for (const row of result.rows)
        await tx.insert(bappReviewerAssignments).values(row).onDuplicateKeyUpdate({ set: { userPetugas: row.userPetugas } })
    })
    const actor = await getSessionUser(context)
    if (actor) await recordActivity(context, actor, 'BAPP_NPSN_AUTO_ASSIGNED', `${result.rows.length} NPSN`).catch(console.error)
    return { success: true, count: result.rows.length, conflicts: result.conflicts, unregistered: result.unregistered, invalid: result.invalid }
  })

const bappSummaryFields = {
  perluDireviu: sql<number>`coalesce(sum(case when ${masterBapp.statusProgress} = 'INSTALASI SELESAI' then 1 else 0 end), 0)`.mapWith(Number),
  totalDisetujui: sql<number>`coalesce(sum(case when ${masterBapp.statusProgress} = 'DISETUJUI' then 1 else 0 end), 0)`.mapWith(Number),
  totalSesuaiApip: sql<number>`coalesce(sum(case when ${masterBapp.statusProgress} = 'SESUAI APIP' then 1 else 0 end), 0)`.mapWith(Number),
  totalReviuApip: sql<number>`coalesce(sum(case when ${masterBapp.statusProgress} = 'REVIU APIP' then 1 else 0 end), 0)`.mapWith(Number),
  totalDitolakRevisi: sql<number>`coalesce(sum(case when ${masterBapp.hasilAkhirReviu} = 'Tidak Sesuai' or ${masterBapp.statusProgress} = 'REVISI' then 1 else 0 end), 0)`.mapWith(Number)
}

export async function loadBappDashboard(mineUsername?: string) {
  const [summary] = mineUsername
    ? await db.select(bappSummaryFields).from(masterBapp)
      .where(eq(masterBapp.petugasReviu, mineUsername))
    : await db.select(bappSummaryFields).from(masterBapp)
  const reviewers = mineUsername ? [] : await db.select({
      username: petugasReviewer.userPetugas,
      petugas: petugasReviewer.namaPetugas,
      alokasi: sql<number>`count(${masterBapp.id})`.mapWith(Number),
      diterima: sql<number>`coalesce(sum(case when ${masterBapp.hasilAkhirReviu} = 'Sesuai' then 1 else 0 end), 0)`.mapWith(Number),
      ditolak: sql<number>`coalesce(sum(case when ${masterBapp.statusProgress} = 'REVISI' then 0 when ${masterBapp.hasilAkhirReviu} = 'Tidak Sesuai' then 1 else 0 end), 0)`.mapWith(Number),
      sedangRevisi: sql<number>`coalesce(sum(case when ${masterBapp.statusProgress} = 'REVISI' then 1 else 0 end), 0)`.mapWith(Number),
      sudahDiperiksa: sql<number>`count(${masterBapp.hasilAkhirReviu})`.mapWith(Number),
      belumDiperiksa: sql<number>`coalesce(sum(case when ${masterBapp.sudahAdaRevisi} = 'Tidak' and ${masterBapp.statusProgress} = 'INSTALASI SELESAI' then 1 else 0 end), 0)`.mapWith(Number)
    }).from(petugasReviewer)
      .leftJoin(masterBapp, eq(petugasReviewer.userPetugas, masterBapp.petugasReviu))
      .groupBy(petugasReviewer.id)
  reviewers.sort((a, b) => b.sudahDiperiksa - a.sudahDiperiksa || a.petugas.localeCompare(b.petugas))
  return { summary, reviewers }
}

export const bappReview = new Elysia()
  .get('/api/bapp-dashboard', async context => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
    if (user.role !== 'Admin' && user.role !== 'Internal') { context.set.status = 403; return { message: 'Dashboard BAPP hanya untuk Admin dan Internal.' } }
    const dashboard = await loadBappDashboard(context.query.scope === 'mine' ? user.username : undefined)
    context.set.headers['Cache-Control'] = 'no-store'
    return dashboard
  })
  .get('/api/bapp-review', async context => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
    if (user.role !== 'Internal') { context.set.status = 403; return { message: 'Hanya akun Internal yang dapat melihat Cek BAPP.' } }
    const page = Number(context.query.page ?? 1)
    if (!Number.isSafeInteger(page) || page < 1) { context.set.status = 400; return { message: 'Nomor halaman tidak valid.' } }
    const requestedStatus = context.query.status?.trim() ?? ''
    const status = requestedStatus === 'REVISI' ? 'DITOLAK_REVISI' : requestedStatus
    if (status.length > 80) { context.set.status = 400; return { message: 'Status progress tidak valid.' } }
    const pageSize = 15
    const scope = eq(masterBapp.petugasReviu, user.username)
    const rejectedOrRevising = or(eq(masterBapp.hasilAkhirReviu, 'Tidak Sesuai'), eq(masterBapp.statusProgress, 'REVISI'))!
    const statuses = (await db.select({ code: masterBapp.statusProgress, count: sql<number>`count(*)`.mapWith(Number) })
      .from(masterBapp)
      .where(scope).groupBy(masterBapp.statusProgress)).filter((row): row is { code: string; count: number } => Boolean(row.code) && row.code !== 'REVISI')
    const [{ count: rejectedCount }] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(masterBapp)
      .where(and(scope, rejectedOrRevising))
    statuses.push({ code: 'DITOLAK_REVISI', count: rejectedCount })
    if (status) {
      const total = statuses.find(row => row.code === status)?.count ?? 0
      const records = await db.select().from(masterBapp)
        .where(and(scope, status === 'DITOLAK_REVISI' ? rejectedOrRevising : eq(masterBapp.statusProgress, status)))
        .orderBy(asc(masterBapp.npsn), asc(masterBapp.idTransaksi)).limit(pageSize).offset((page - 1) * pageSize)
      const rows = records.map(review => ({ npsn: review.npsn, userPetugas: review.petugasReviu, review, transaction: transactionFromMaster(review) }))
      context.set.headers['Cache-Control'] = 'no-store'
      return { data: rows, page, total, pageSize, statuses }
    }
    const [{ total }] = await db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(masterBapp).where(scope)
    const records = await db.select().from(masterBapp).where(scope)
      .orderBy(asc(masterBapp.npsn), asc(masterBapp.idTransaksi)).limit(pageSize).offset((page - 1) * pageSize)
    const rows = records.map(review => ({ npsn: review.npsn, userPetugas: review.petugasReviu, review, transaction: transactionFromMaster(review) }))
    context.set.headers['Cache-Control'] = 'no-store'
    return { data: rows, page, total, pageSize, statuses }
  })
.get('/api/bapp-review/notifications', async context => {
  const user = await getSessionUser(context)
  if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
  if (user.role !== 'Internal') { context.set.status = 403; return { message: 'Notifikasi BAPP hanya untuk akun Internal.' } }
  const notifications = await db.select({ id: bappReviewNotifications.id, idTransaksi: bappReviewNotifications.idTransaksi, namaSekolah: bappReviewNotifications.namaSekolah, npsn: bappReviewNotifications.npsn, isRevision: sql<boolean>`${masterBapp.sudahAdaRevisi} = 'Ya'`.mapWith(Boolean) })
    .from(bappReviewNotifications).leftJoin(masterBapp, eq(masterBapp.idTransaksi, bappReviewNotifications.idTransaksi))
    .where(and(eq(bappReviewNotifications.userPetugas, user.username), isNull(bappReviewNotifications.readAt))).orderBy(asc(bappReviewNotifications.id))
  context.set.headers['Cache-Control'] = 'no-store'
  return { notifications }
})
.post('/api/bapp-review/notifications/read', async context => {
  const user = await getSessionUser(context)
  if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
  if (user.role !== 'Internal') { context.set.status = 403; return { message: 'Notifikasi BAPP hanya untuk akun Internal.' } }
  await db.update(bappReviewNotifications).set({ readAt: new Date() })
    .where(and(eq(bappReviewNotifications.userPetugas, user.username), inArray(bappReviewNotifications.id, context.body.ids), isNull(bappReviewNotifications.readAt)))
  return { success: true }
}, { body: t.Object({ ids: t.Array(t.Number({ minimum: 1 }), { minItems: 1 }) }) })
.patch('/api/bapp-review/:id/draft', async context => {
  const user = await getSessionUser(context)
  if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
  if (user.role !== 'Internal') { context.set.status = 403; return { message: 'Hanya akun Internal yang dapat mereviu BAPP.' } }
  const id = context.params.id
  if (!id || id.length > 80) { context.set.status = 400; return { message: 'ID transaksi tidak valid.' } }
  const [stored] = await db.select({ petugasReviu: masterBapp.petugasReviu, statusProgress: masterBapp.statusProgress }).from(masterBapp).where(eq(masterBapp.idTransaksi, id)).limit(1)
  if (!stored) { context.set.status = 404; return { message: 'Transaksi belum ada di master BAPP.' } }
  if (stored.petugasReviu.toLowerCase() !== user.username.toLowerCase()) { context.set.status = 403; return { message: 'Transaksi bukan milik petugas Anda.' } }
  if (stored.statusProgress === 'DISETUJUI') return { success: true, alreadyApproved: true }
  if (lockedBappReviewStatuses.has(stored.statusProgress ?? '')) { context.set.status = 409; return { message: `Reviu tidak dapat diubah pada status ${stored.statusProgress}.` } }
  await db.update(masterBapp).set(context.body).where(eq(masterBapp.idTransaksi, id))
  return { success: true }
}, { body: draftBody })
.get('/api/bapp-review/:id/detail', async context => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
    if (user.role !== 'Internal') { context.set.status = 403; return { message: 'Hanya akun Internal yang dapat melihat detail BAPP.' } }
    const id = context.params.id
    if (!id || id.length > 80) { context.set.status = 400; return { message: 'ID transaksi tidak valid.' } }
    const [stored] = await db.select({ npsn: masterBapp.npsn, serialNumber: masterBapp.serialNumber, petugasReviu: masterBapp.petugasReviu }).from(masterBapp)
      .where(eq(masterBapp.idTransaksi, id)).limit(1)
    if (!stored) { context.set.status = 404; return { message: 'Transaksi belum ada di master BAPP.' } }
    if (stored.petugasReviu.toLowerCase() !== user.username.toLowerCase()) { context.set.status = 403; return { message: 'Transaksi bukan milik petugas Anda.' } }
    try {
      const transaction = await getHisenseTransaction(id, 'smk', { bypassCache: true })
      if (!transaction || transaction.npsn_info?.npsn?.trim() !== stored.npsn) {
        context.set.status = 404
        return { message: 'Detail transaksi tidak ditemukan di Hisense.' }
      }
      if (stored.serialNumber?.trim() && transaction.serial_number?.trim() !== stored.serialNumber.trim()) {
        context.set.status = 409
        return { message: 'Serial Number Hisense berbeda dari master BAPP.' }
      }
      context.set.headers['Cache-Control'] = 'no-store'
      return { data: transaction }
    } catch (error) {
      context.set.status = 502
      return { message: error instanceof Error ? error.message : 'Data Hisense belum dapat dimuat.' }
    }
  })
  .post('/api/bapp-review/:id', async context => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
    if (user.role !== 'Internal') { context.set.status = 403; return { message: 'Hanya akun Internal yang dapat mereviu BAPP.' } }
    const id = context.params.id
    if (!id || id.length > 80) { context.set.status = 400; return { message: 'ID transaksi tidak valid.' } }
    const [stored] = await db.select({ npsn: masterBapp.npsn, serialNumber: masterBapp.serialNumber, sudahAdaRevisi: masterBapp.sudahAdaRevisi, petugasReviu: masterBapp.petugasReviu, statusProgress: masterBapp.statusProgress }).from(masterBapp).where(eq(masterBapp.idTransaksi, id)).limit(1)
    if (!stored) { context.set.status = 404; return { message: 'Transaksi belum ada di master BAPP.' } }
    if (stored.petugasReviu.toLowerCase() !== user.username.toLowerCase()) { context.set.status = 403; return { message: 'Transaksi bukan milik petugas Anda.' } }
    if (stored.statusProgress === 'DISETUJUI' && context.body.action === 'approve') {
      return { success: true, hasilAkhirReviu: 'Sesuai', statusProgress: 'DISETUJUI', alreadyApproved: true }
    }
    if (lockedBappReviewStatuses.has(stored.statusProgress ?? '')) {
      context.set.status = 409
      return { message: `Reviu tidak dapat diubah pada status ${stored.statusProgress}.` }
    }
    let transaction: HisenseTransaction | null
try { transaction = await getHisenseTransaction(id, 'smk', { bypassCache: true }) }
    catch (error) { context.set.status = 502; return { message: error instanceof Error ? error.message : 'Hisense API unavailable' } }
    const npsn = transaction?.npsn_info?.npsn?.trim()
    if (!transaction || !npsn) { context.set.status = 404; return { message: 'Transaksi Hisense tidak ditemukan.' } }
    if (npsn !== stored.npsn || (stored.serialNumber?.trim() && transaction.serial_number?.trim() !== stored.serialNumber.trim())) {
      context.set.status = 409
      return { message: 'NPSN atau Serial Number Hisense berbeda dari master BAPP.' }
    }
    if (transaction.kode_status_progress === 'DISETUJUI' && context.body.action === 'approve') {
      await db.update(masterBapp).set({ statusProgress: 'DISETUJUI', hasilAkhirReviu: 'Sesuai' }).where(eq(masterBapp.idTransaksi, id))
      return { success: true, hasilAkhirReviu: 'Sesuai', statusProgress: 'DISETUJUI', alreadyApproved: true }
    }
    if (lockedBappReviewStatuses.has(transaction.kode_status_progress ?? '')) {
      context.set.status = 409
      return { message: `Reviu tidak dapat diubah pada status ${transaction.kode_status_progress}.` }
    }
    const body = context.body
const verdicts = [body.fotoPlangSekolah, body.fotoBoxPic, body.fotoKelengkapanUnit, body.fotoProsesInstalasi, body.fotoKesesuaianSerialNumber, body.fotoTrainingRumahPendidikan, body.fotoBapp1, body.fotoBapp2]
const reasons = body.rejectionReasons ?? []
if (body.action === 'approve' && finalReviewResult(verdicts) !== 'Sesuai') {
  context.set.status = 400
  return { message: 'Semua foto harus Sesuai sebelum BAPP disetujui.' }
}
if (body.action === 'reject' && (!reasons.length || reasons.some(reason => !bappRejectionReasons.includes(reason as typeof bappRejectionReasons[number])) || new Set(reasons).size !== reasons.length || !body.rejectionNote?.trim())) {
  context.set.status = 400
  return { message: 'Pilih minimal satu alasan penolakan dan isi catatan penolakan.' }
}
const hasilAkhirReviu: 'Sesuai' | 'Tidak Sesuai' = body.action === 'approve' ? 'Sesuai' : 'Tidak Sesuai'
const nextStatus = body.action === 'approve' ? 'DISETUJUI' : 'REVISI'
try {
  await reviewHisenseAllocation(id, {
    kode_status_progress: nextStatus,
    reviewer_name: user.username,
    ...(body.action === 'reject' ? { tag_revisi: reasons, catatan_revisi: body.rejectionNote!.trim() } : {})
    }, String(context.cookie.monitoring_session?.value ?? ''))
} catch (error) {
  context.set.status = 502
  return { message: error instanceof Error ? error.message : 'Reviu gagal dikirim ke Hisense.' }
}
    const tag = transaction.tag_revisi
    const review = {
      idTransaksi: id,
      sudahAdaRevisi: stored.sudahAdaRevisi,
  statusProgress: nextStatus,
      npsn,
      namaSekolah: transaction.npsn_info?.nama_sekolah?.slice(0, 255) ?? null,
      propinsi: transaction.npsn_info?.propinsi?.slice(0, 120) ?? null,
      kabupatenKota: transaction.npsn_info?.kabupaten_kota?.slice(0, 120) ?? null,
      kecamatan: transaction.npsn_info?.kecamatan?.slice(0, 120) ?? null,
      serialNumber: transaction.serial_number?.slice(0, 160) ?? null,
  tag: body.action === 'reject' ? reasons.join(', ') : Array.isArray(tag) ? tag.join(', ') : typeof tag === 'string' ? tag : null,
      petugasReviu: stored.petugasReviu,
  fotoPlangSekolah: body.fotoPlangSekolah, fotoBoxPic: body.fotoBoxPic,
  fotoKelengkapanUnit: body.fotoKelengkapanUnit, fotoProsesInstalasi: body.fotoProsesInstalasi,
  fotoKesesuaianSerialNumber: body.fotoKesesuaianSerialNumber, fotoTrainingRumahPendidikan: body.fotoTrainingRumahPendidikan,
  fotoBapp1: body.fotoBapp1, fotoBapp2: body.fotoBapp2,
  catatanPetugas: body.catatanPetugas?.trim() || (body.action === 'reject' ? body.rejectionNote?.trim() : null) || null,
      hasilAkhirReviu
    }
    await db.insert(masterBapp).values(review).onDuplicateKeyUpdate({ set: review })
await recordActivity(context, user, body.action === 'approve' ? 'BAPP_REVIEW_APPROVED' : 'BAPP_REVIEW_REJECTED', `Transaksi: ${id}; Hasil: ${hasilAkhirReviu}`).catch(console.error)
return { success: true, hasilAkhirReviu, statusProgress: nextStatus }
  }, { body: reviewBody })
