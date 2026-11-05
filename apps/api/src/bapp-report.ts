import { Elysia, t } from 'elysia'
import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import ExcelJS from 'exceljs'
import { db } from './db/index.js'
import { bappScans, bappStorages, bappFolders, users, schools as schoolDirectory } from './db/schema.js'
import { getSessionUser } from './auth.js'
import { loadSchoolProgress } from './bapp-school-progress.js'

type Filters = { storage?: string; vendor?: string; completion?: string; search?: string; page?: string; schoolPage?: string }
const querySchema = t.Object({ schoolPage: t.Optional(t.String({ pattern: '^[1-9][0-9]*$' })), storage: t.Optional(t.String({ pattern: '^[1-9][0-9]*$' })), vendor: t.Optional(t.Union([t.Literal('Hisense'), t.Literal('Skylink'), t.Literal('PLN')])), completion: t.Optional(t.Union([t.Literal('complete'), t.Literal('incomplete'), t.Literal('unknown')])), search: t.Optional(t.String({ maxLength: 120 })), page: t.Optional(t.String({ pattern: '^[1-9][0-9]*$' })) })
const completionLabels = { complete: 'Lengkap', incomplete: 'Belum lengkap', unknown: 'Belum diketahui' }
const validationLabels = { pending: 'Menunggu pengecekan', checking: 'Sedang mengecek', valid: 'Valid', invalid: 'Tidak valid', error: 'Perlu cek ulang', unsupported: 'Pengecekan belum tersedia' }
const wib = (date: Date) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(date) + ' WIB'

export async function buildBappReport(filters: Filters) {
  const conditions = []
  if (filters.storage) conditions.push(eq(bappScans.storageId, Number(filters.storage)))
  if (filters.vendor) conditions.push(eq(bappStorages.vendor, filters.vendor as 'Hisense' | 'Skylink' | 'PLN'))
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().replace(/[\\%_]/g, value => `\\${value}`)}%`
    conditions.push(or(like(bappScans.barcode, term), like(bappScans.npsn, term), like(bappScans.schoolName, term), like(bappStorages.name, term)))
  }
  const scans = await db.select({ id: bappScans.id, barcode: bappScans.barcode, createdAt: bappScans.createdAt, schoolName: bappScans.schoolName, npsn: bappScans.npsn,
    validationStatus: bappScans.validationStatus, validationMessage: bappScans.validationMessage,
    folderNumber: bappFolders.number, storageId: bappScans.storageId, storageName: bappStorages.name, storageType: bappStorages.type, vendor: bappStorages.vendor, scannedBy: users.username,
    occurrences: sql<number>`(select count(*) from bapp_scans other_scan where other_scan.barcode = ${bappScans.barcode})`.mapWith(Number)
  }).from(bappScans).innerJoin(bappStorages, eq(bappScans.storageId, bappStorages.id)).leftJoin(bappFolders, eq(bappScans.folderId, bappFolders.id)).leftJoin(users, eq(bappScans.scannedBy, users.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(bappScans.id))
  const progress = await loadSchoolProgress(scans.filter(row => row.vendor === 'Hisense' && row.validationStatus === 'valid').map(row => row.npsn ?? ''))
  const enriched = scans.map(row => {
    const schoolProgress = row.vendor === 'Hisense' && row.validationStatus === 'valid' && row.npsn ? progress.get(row.npsn) ?? null : null
    const completion: keyof typeof completionLabels = schoolProgress?.status === 'ready' && schoolProgress.total !== null && schoolProgress.scanned !== null
      ? schoolProgress.scanned === schoolProgress.total ? 'complete' : 'incomplete' : 'unknown'
    return { ...row, schoolProgress, completion }
  })
  const rows = enriched.filter(row => !filters.completion || row.completion === filters.completion)
  const schools = new Map<string, { npsn: string; schoolName: string | null; vendor: string; scanned: number | null; total: number | null; missing: number | null; completion: keyof typeof completionLabels; checkedAt: Date | null; storages: string[] }>()
  for (const row of rows) {
    if (!row.npsn) continue
    const key = `${row.vendor}:${row.npsn}`
    const previous = schools.get(key)
    const ready = row.schoolProgress?.status === 'ready'
    const locations = [...new Set([...(previous?.storages ?? []), row.storageName])]
    if (!previous || ready || previous.completion === 'unknown') {
      schools.set(key, { npsn: row.npsn, schoolName: row.schoolName, vendor: row.vendor, scanned: ready ? row.schoolProgress!.scanned : null, total: ready ? row.schoolProgress!.total : null, missing: ready ? row.schoolProgress!.total! - row.schoolProgress!.scanned! : null, completion: row.completion, checkedAt: row.schoolProgress?.checkedAt ?? null, storages: locations })
    } else previous.storages = locations
  }
  const schoolRows = [...schools.values()]
  // Schools without any scan have no vendor or storage assignment yet.
  // Their expected BAPP count comes from the allocation in the school directory.
  if (!filters.storage && !filters.vendor && (!filters.completion || filters.completion === 'incomplete')) {
    const unscannedConditions = [
      sql`${schoolDirectory.jumlahPid} > 0`,
      sql`not exists (select 1 from ${bappScans} where trim(${bappScans.npsn}) = trim(${schoolDirectory.npsn}))`
    ]
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim().replace(/[\\%_]/g, value => `\\${value}`)}%`
      unscannedConditions.push(sql`(${schoolDirectory.npsn} like ${term} or ${schoolDirectory.namaSekolah} like ${term})`)
    }
    const unscanned = await db.select({ npsn: schoolDirectory.npsn, schoolName: schoolDirectory.namaSekolah, total: schoolDirectory.jumlahPid })
      .from(schoolDirectory).where(and(...unscannedConditions))
    for (const school of unscanned) {
      schoolRows.push({ ...school, vendor: 'Belum diketahui', scanned: 0, missing: school.total, completion: 'incomplete', checkedAt: null, storages: [] })
    }
  }
  const known = schoolRows.filter(school => school.total !== null)
  const summary = {
    totalScans: rows.length, uniqueTransactions: new Set(rows.map(row => `${row.vendor}:${row.barcode}`)).size,
    totalSchools: schoolRows.length, completeSchools: schoolRows.filter(s => s.completion === 'complete').length,
    incompleteSchools: schoolRows.filter(s => s.completion === 'incomplete').length, unknownSchools: schoolRows.filter(s => s.completion === 'unknown').length,
    unscannedSchools: schoolRows.filter(s => s.scanned === 0 && s.storages.length === 0).length,
    totalPid: known.reduce((sum, s) => sum + s.total!, 0), completePid: known.reduce((sum, s) => sum + s.scanned!, 0), incompletePid: known.reduce((sum, s) => sum + s.missing!, 0),
    unknownTransactions: new Set(rows.filter(row => row.completion === 'unknown').map(row => `${row.vendor}:${row.barcode}`)).size
  }
  return { rows, schools: schoolRows, summary, generatedAt: new Date() }
}

export async function createBappWorkbook(report: Awaited<ReturnType<typeof buildBappReport>>, filters: Filters, storageName: string) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Monitoring Digit'
  workbook.created = report.generatedAt
  const summary = workbook.addWorksheet('Ringkasan')
  summary.columns = [{ header: 'Keterangan', key: 'label', width: 44 }, { header: 'Nilai', key: 'value', width: 95 }]
  const values: [string, string | number][] = [
    ['Dicetak pada', wib(report.generatedAt)], ['Penyimpanan', storageName], ['Vendor', filters.vendor ?? 'Semua vendor'], ['Kelengkapan sekolah', filters.completion ? completionLabels[filters.completion as keyof typeof completionLabels] : 'Semua status'], ['Pencarian', filters.search ?? ''],
    ['Total scan tercatat', report.summary.totalScans], ['Serial number unik', report.summary.uniqueTransactions], ['Sekolah', report.summary.totalSchools],
    ['Total PID diketahui', report.summary.totalPid], ['PID: BAPP sudah terscan', report.summary.completePid], ['PID: BAPP belum terscan', report.summary.incompletePid],
    ['Sekolah lengkap', report.summary.completeSchools], ['Sekolah belum lengkap', report.summary.incompleteSchools], ['Sekolah belum diketahui', report.summary.unknownSchools], ['Serial number belum diketahui', report.summary.unknownTransactions],
    ['Sekolah belum pernah discan', report.summary.unscannedSchools],
    ['Dasar hitungan', 'Sekolah terscan: satu serial_number unik = satu PID. Sekolah belum pernah discan: total dari schools.jumlah_pid, terscan 0. Duplikat tidak menambah jumlah PID.'],
    ['Cakupan PID', 'Sekolah pada hasil filter dihitung sekali per vendor dan NPSN. Progres sekolah mencakup seluruh penyimpanan Hisense, termasuk dokumen di luar penyimpanan yang dipilih.'],
    ['Belum diketahui', 'Serial number belum valid, total sekolah belum tersedia, serta vendor tanpa integrasi tidak dimasukkan ke total PID diketahui.'],
    ['Sekolah belum pernah discan', 'Sekolah database dengan alokasi PID positif dan belum memiliki scan berdasarkan NPSN. Belum memiliki vendor/penyimpanan; tampil saat semua vendor dan semua penyimpanan dipilih.'],
    ['Cakupan ekspor', 'Seluruh baris hasil filter, termasuk scan berulang; bukan hanya halaman tabel yang sedang tampil.']
  ]
  values.forEach(([label, value]) => summary.addRow({ label, value }))
  const transactions = workbook.addWorksheet('Serial Number')
  transactions.columns = ['ID Scan', 'Waktu Scan WIB', 'Serial Number', 'NPSN', 'Sekolah', 'Vendor', 'Kode Penyimpanan', 'Nama Penyimpanan', 'Tipe Penyimpanan', 'Status Validasi', 'Catatan Validasi', 'BAPP Terscan Sekolah', 'Total PID Sekolah', 'BAPP Belum Terscan', 'Kelengkapan Sekolah', 'Peringatan', 'Petugas', 'Pengecekan Sekolah WIB', 'Map'].map(header => ({ header, width: header === 'Sekolah' || header === 'Catatan Validasi' ? 40 : 25 }))
  for (const row of report.rows) transactions.addRow([row.id, wib(row.createdAt), row.barcode, row.npsn ?? '', row.schoolName ?? '', row.vendor, `BAPP-${String(row.storageId).padStart(6, '0')}`, row.storageName, row.storageType, validationLabels[row.validationStatus], row.validationMessage ?? '', row.schoolProgress?.scanned ?? null, row.schoolProgress?.total ?? null, row.schoolProgress?.status === 'ready' ? row.schoolProgress.total! - row.schoolProgress.scanned! : null, completionLabels[row.completion], row.occurrences > 1 ? `Duplikat (${row.occurrences} scan)` : '', row.scannedBy ?? '', row.schoolProgress?.checkedAt ? wib(row.schoolProgress.checkedAt) : '', row.folderNumber === null ? 'Belum ditentukan' : `Map ${row.folderNumber}`])
  const schools = workbook.addWorksheet('Rekap Sekolah')
  schools.columns = ['NPSN', 'Sekolah', 'Vendor', 'PID: BAPP Terscan', 'Total PID', 'PID: BAPP Belum Terscan', 'Kelengkapan', 'Penyimpanan pada Hasil Filter', 'Pengecekan WIB'].map(header => ({ header, width: header.includes('Penyimpanan') || header === 'Sekolah' ? 45 : 26 }))
  for (const row of report.schools) schools.addRow([row.npsn, row.schoolName ?? '', row.vendor, row.scanned, row.total, row.missing, completionLabels[row.completion], row.storages.join(', '), row.checkedAt ? wib(row.checkedAt) : ''])
  for (const sheet of workbook.worksheets) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF075985' } }
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: sheet.columnCount } }
    sheet.eachRow(row => { row.alignment = { vertical: 'top', wrapText: true } })
  }
  summary.getRow(18).height = 48
  return workbook.xlsx.writeBuffer()
}

export const bappReportRoutes = new Elysia({ prefix: '/api/bapp-report' })
  .onBeforeHandle(async context => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Silakan login terlebih dahulu.' } }
    if (user.role !== 'Admin' && user.role !== 'Internal') { context.set.status = 403; return { message: 'Rekap hanya tersedia untuk Admin dan Internal.' } }
  })
  .get('/', async context => {
    const page = Number(context.query.page ?? 1)
    const requestedSchoolPage = Number(context.query.schoolPage ?? 1)
    if (!Number.isSafeInteger(requestedSchoolPage) || !Number.isSafeInteger(page) || !Number.isSafeInteger(Number(context.query.storage ?? 1))) { context.set.status = 400; return { message: 'Filter tidak valid.' } }
    const report = await buildBappReport(context.query)
    const storages = await db.select({ id: bappStorages.id, name: bappStorages.name, vendor: bappStorages.vendor, type: bappStorages.type }).from(bappStorages).orderBy(bappStorages.name)
    const incompleteSchools = report.schools.filter(school => school.completion === 'incomplete')
      .sort((a, b) => (a.schoolName ?? '').localeCompare(b.schoolName ?? '', 'id') || a.npsn.localeCompare(b.npsn))
    const schoolPage = Math.min(requestedSchoolPage, Math.max(1, Math.ceil(incompleteSchools.length / 50)))
    return { incompleteSchools: { data: incompleteSchools.slice((schoolPage - 1) * 50, schoolPage * 50), totalRows: incompleteSchools.length, page: schoolPage, pageSize: 50 }, data: report.rows.slice((page - 1) * 50, page * 50), summary: report.summary, generatedAt: report.generatedAt, page, pageSize: 50, totalRows: report.rows.length, storages }
  }, { query: querySchema })
  .get('/export', async context => {
    if (!Number.isSafeInteger(Number(context.query.storage ?? 1))) { context.set.status = 400; return { message: 'Filter tidak valid.' } }
    const report = await buildBappReport(context.query)
    let storageName = 'Semua penyimpanan'
    if (context.query.storage) {
      const [storage] = await db.select().from(bappStorages).where(eq(bappStorages.id, Number(context.query.storage)))
      storageName = storage?.name ?? `ID ${context.query.storage}`
    }
    const buffer = await createBappWorkbook(report, context.query, storageName)
    return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="rekap-scan-bapp.xlsx"', 'Cache-Control': 'no-store' } })
  }, { query: querySchema })
