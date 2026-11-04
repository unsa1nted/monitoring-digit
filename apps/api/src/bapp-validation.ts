import { and, eq, lt, or, isNull } from 'drizzle-orm'
import { db } from './db/index.js'
import { bappScans, bappStorages } from './db/schema.js'
import { getHisenseTransaction } from './hisense.js'
import { processSchoolCounts } from './bapp-school-progress.js'

let running = false

export async function validateClaimedBappScan(scan: { id: number; barcode: string }, claimedAt: Date, lookup = getHisenseTransaction) {
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
      validationMessage: transaction ? 'Nomor transaksi ditemukan di Hisense.' : 'Nomor transaksi tidak ditemukan di Hisense SMK.',
      schoolName: transaction?.npsn_info?.nama_sekolah?.slice(0, 255) ?? null,
      npsn: transaction?.npsn_info?.npsn?.trim().slice(0, 20) || null,
      checkedAt: new Date()
    }).where(claim)
  } catch {
    await db.update(bappScans).set({ validationStatus: 'error', validationMessage: 'Hisense belum dapat memastikan transaksi. Silakan cek ulang.', checkedAt: new Date() }).where(claim)
  }
}

// Pending work lives in MySQL, so restarting the API does not lose verification jobs.
export async function processBappValidations() {
  if (running) return
  running = true
  try {
    const stale = new Date(Date.now() - 5 * 60_000)
    await db.update(bappScans).set({ validationStatus: 'pending', claimedAt: null }).where(and(eq(bappScans.validationStatus, 'checking'), or(lt(bappScans.claimedAt, stale), isNull(bappScans.claimedAt))))
    const pending = await db.select({ id: bappScans.id, barcode: bappScans.barcode }).from(bappScans).where(eq(bappScans.validationStatus, 'pending')).orderBy(bappScans.id).limit(3)
    await Promise.all(pending.map(async scan => {
      const claimedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
      const [claim] = await db.update(bappScans).set({ validationStatus: 'checking', claimedAt }).where(and(eq(bappScans.id, scan.id), eq(bappScans.validationStatus, 'pending')))
      if (!claim.affectedRows) return
      await validateClaimedBappScan(scan, claimedAt)
    }))
  } finally { running = false }
}

export function startBappValidationWorker() {
  const run = () => {
    void processBappValidations().catch(error => console.error('Bapp verification worker:', error))
    void processSchoolCounts().catch(error => console.error('Bapp school worker:', error))
  }
  const timer = setInterval(run, 2000)
  timer.unref()
  run()
  return timer
}
