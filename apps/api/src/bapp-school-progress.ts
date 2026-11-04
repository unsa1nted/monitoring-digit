import { and, eq, inArray, isNull, lt, or } from 'drizzle-orm'
import { db } from './db/index.js'
import { bappScans, bappSchoolCounts, bappStorages } from './db/schema.js'
import { getHisenseSmkPages, type HisenseTransaction } from './hisense.js'

type SchoolPages = (filters: Record<string, string | undefined>) => AsyncIterable<HisenseTransaction[]>
export type SchoolProgress = { status: 'pending' | 'checking' | 'ready' | 'error'; scanned: number | null; total: number | null; checkedAt: Date | null }

export async function getSchoolTransactionIds(npsn: string, pages: SchoolPages = getHisenseSmkPages) {
  const ids = new Set<string>()
  for await (const rows of pages({ search: npsn })) {
    for (const row of rows) {
      if (row.npsn_info?.npsn?.trim() !== npsn) continue
      if (!row.id_transaksi?.trim()) throw new Error('Nomor transaksi sekolah tidak lengkap.')
      ids.add(row.id_transaksi.trim())
    }
  }
  // NPSN comes from an already verified scan; zero matches means inconsistent data.
  if (!ids.size) throw new Error('Transaksi sekolah belum dapat dikonfirmasi.')
  return [...ids]
}

export function countSchoolProgress(expectedIds: string[], scannedIds: string[]) {
  const expected = new Set(expectedIds)
  const scanned = new Set(scannedIds.filter(id => expected.has(id)))
  return { scanned: scanned.size, total: expected.size }
}

export async function queueSchoolCount(npsn: string, force = false) {
  await db.insert(bappSchoolCounts).values({ npsn }).onDuplicateKeyUpdate({ set: { npsn } })
  if (force) {
    await db.update(bappSchoolCounts).set({ status: 'pending', message: null }).where(and(eq(bappSchoolCounts.npsn, npsn), inArray(bappSchoolCounts.status, ['ready', 'error'])))
  }
}

export async function loadSchoolProgress(npsns: string[]): Promise<Map<string, SchoolProgress>> {
  const keys = [...new Set(npsns.filter(Boolean))]
  const result = new Map<string, SchoolProgress>()
  if (!keys.length) return result
  const cached = await db.select().from(bappSchoolCounts).where(inArray(bappSchoolCounts.npsn, keys))
  const byNpsn = new Map(cached.map(row => [row.npsn, row]))
  for (const npsn of keys) {
    const row = byNpsn.get(npsn)
    const stale = row && ['ready', 'error'].includes(row.status) && (!row.checkedAt || Date.now() - row.checkedAt.getTime() > 10 * 60_000)
    if (!row || stale) {
      await queueSchoolCount(npsn, !!stale)
      result.set(npsn, { status: 'pending', scanned: null, total: null, checkedAt: row?.checkedAt ?? null })
    }
  }
  const scans = await db.select({ npsn: bappScans.npsn, barcode: bappScans.barcode, checkedAt: bappScans.checkedAt }).from(bappScans)
    .innerJoin(bappStorages, eq(bappScans.storageId, bappStorages.id))
    .where(and(inArray(bappScans.npsn, keys), eq(bappScans.validationStatus, 'valid'), eq(bappStorages.vendor, 'Hisense')))
  const scannedIds = new Map<string, string[]>()
  for (const scan of scans) {
    const ids = scannedIds.get(scan.npsn!) ?? []
    ids.push(scan.barcode)
    scannedIds.set(scan.npsn!, ids)
  }
  for (const row of cached) {
    if (result.has(row.npsn)) continue
    if (row.status === 'ready' && row.transactionIds?.length) {
      const expected = new Set(row.transactionIds)
      if (scans.some(scan => scan.npsn === row.npsn && !expected.has(scan.barcode) && scan.checkedAt && row.checkedAt && scan.checkedAt >= row.checkedAt)) {
        await queueSchoolCount(row.npsn, true)
        result.set(row.npsn, { status: 'pending', scanned: null, total: null, checkedAt: row.checkedAt })
        continue
      }
      result.set(row.npsn, { status: 'ready', ...countSchoolProgress(row.transactionIds, scannedIds.get(row.npsn) ?? []), checkedAt: row.checkedAt })
    } else result.set(row.npsn, { status: row.status === 'ready' ? 'error' : row.status, scanned: null, total: null, checkedAt: row.checkedAt })
  }
  return result
}

export async function syncClaimedSchoolCount(npsn: string, claimedAt: Date, lookup = getSchoolTransactionIds) {
  const claim = and(eq(bappSchoolCounts.npsn, npsn), eq(bappSchoolCounts.status, 'checking'), eq(bappSchoolCounts.claimedAt, claimedAt))
  try {
    const ids = await lookup(npsn)
    if (!ids.length) throw new Error('Transaksi sekolah belum lengkap.')
    await db.update(bappSchoolCounts).set({ status: 'ready', transactionIds: [...new Set(ids)], checkedAt: new Date(), message: null }).where(claim)
  } catch {
    await db.update(bappSchoolCounts).set({ status: 'error', checkedAt: new Date(), message: 'Jumlah BAPP belum dapat diambil dari Hisense. Silakan cek ulang.' }).where(claim)
  }
}

let running = false
export async function processSchoolCounts() {
  if (running) return
  running = true
  try {
    await db.update(bappSchoolCounts).set({ status: 'pending', claimedAt: null }).where(and(eq(bappSchoolCounts.status, 'checking'), or(isNull(bappSchoolCounts.claimedAt), lt(bappSchoolCounts.claimedAt, new Date(Date.now() - 5 * 60_000)))))
    const jobs = await db.select({ npsn: bappSchoolCounts.npsn }).from(bappSchoolCounts).where(eq(bappSchoolCounts.status, 'pending')).limit(2)
    await Promise.all(jobs.map(async job => {
      const claimedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
      const [claim] = await db.update(bappSchoolCounts).set({ status: 'checking', claimedAt }).where(and(eq(bappSchoolCounts.npsn, job.npsn), eq(bappSchoolCounts.status, 'pending')))
      if (claim.affectedRows) await syncClaimedSchoolCount(job.npsn, claimedAt)
    }))
  } finally { running = false }
}
