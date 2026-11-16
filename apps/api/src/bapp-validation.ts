import { and, eq, isNull, lt, or } from 'drizzle-orm'
import { db } from './db/index.js'
import { bappScans, bappStorages } from './db/schema.js'
import { getHisenseBySerialNumber } from './hisense.js'

export async function validateClaimedBappScan(scan: { id: number; barcode: string }, claimedAt: Date, lookup = getHisenseBySerialNumber) {
  const claim = and(eq(bappScans.id, scan.id), eq(bappScans.validationStatus, 'checking'), eq(bappScans.claimedAt, claimedAt))
  const [storage] = await db.select({ vendor: bappStorages.vendor }).from(bappScans).innerJoin(bappStorages, eq(bappStorages.id, bappScans.storageId)).where(eq(bappScans.id, scan.id)).limit(1)
  if (!storage) return
  if (storage.vendor !== 'Hisense') {
    await db.update(bappScans).set({ validationStatus: 'unsupported', validationMessage: `Pengecekan API ${storage.vendor} belum tersedia. Scan tetap tersimpan.`, checkedAt: new Date() }).where(claim)
    return
  }
  try {
    const transaction = await lookup(scan.barcode, 'smk', { bypassCache: true })
    await db.update(bappScans).set({
      validationStatus: transaction ? 'valid' : 'invalid',
      validationMessage: transaction ? 'Serial number ditemukan di Hisense.' : 'Serial number tidak ditemukan di Hisense SMK.',
      schoolName: transaction?.npsn_info?.nama_sekolah?.slice(0, 255) ?? null,
      npsn: transaction?.npsn_info?.npsn?.trim().slice(0, 20) || null,
      checkedAt: new Date()
    }).where(claim)
  } catch {
    await db.update(bappScans).set({ validationStatus: 'error', validationMessage: 'Hisense belum dapat memastikan serial number. Silakan cek ulang.', checkedAt: new Date() }).where(claim)
  }
}

export async function checkBappScan(id: number) {
  await db.update(bappScans).set({ validationStatus: 'pending', claimedAt: null }).where(and(eq(bappScans.id, id), eq(bappScans.validationStatus, 'checking'), or(isNull(bappScans.claimedAt), lt(bappScans.claimedAt, new Date(Date.now() - 5 * 60_000)))))
  const [scan] = await db.select({ id: bappScans.id, barcode: bappScans.barcode }).from(bappScans).where(eq(bappScans.id, id)).limit(1)
  if (!scan) return
  const claimedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
  const [claim] = await db.update(bappScans).set({ validationStatus: 'checking', claimedAt }).where(and(eq(bappScans.id, id), eq(bappScans.validationStatus, 'pending')))
  if (claim.affectedRows) await validateClaimedBappScan(scan, claimedAt)
}
