import '../src/config.js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db, pool } from '../src/db/index.js'
import { users, bappStorages, bappScans, bappSchoolCounts, activityLogs } from '../src/db/schema.js'
import { hashPassword } from '../src/password.js'
import { countSchoolProgress, getSchoolSerialNumbers, loadSchoolProgress, syncClaimedSchoolCount } from '../src/bapp-school-progress.js'
import { getHisenseTransactions } from '../src/hisense.js'

const key = `test_${randomUUID().slice(0, 8)}`
const npsn = `${key}_school`
const otherSchool = `${key}_other`
const ids = [`${key}_A`, `${key}_B`, `${key}_C`]
const password = randomUUID()
const storageIds: number[] = []
try {
  const result = await getSchoolSerialNumbers(npsn, async function* () {
    yield [{ serial_number: ids[0], npsn_info: { npsn } }, { serial_number: 'other', npsn_info: { npsn: otherSchool } }]
    yield [{ serial_number: ids[1], npsn_info: { npsn } }, { serial_number: ids[0], npsn_info: { npsn } }, { serial_number: ids[2], npsn_info: { npsn } }]
  })
  assert.deepEqual(result, ids)
  assert.deepEqual(await getSchoolSerialNumbers(npsn, async function* () {
    yield [{ id_transaksi: 'TX-IGNORED', serial_number: '000-SERIAL', npsn_info: { npsn } }]
  }), ['000-SERIAL'])
  await assert.rejects(getSchoolSerialNumbers(npsn, async function* () {
    yield [{ id_transaksi: 'TX-ONLY', npsn_info: { npsn } }]
  }), /Serial number/)
  await assert.rejects(getSchoolSerialNumbers(npsn, async function* () {
    yield ['TX-1', 'TX-2'].map(id_transaksi => ({ id_transaksi, serial_number: 'SAME-SERIAL', npsn_info: { npsn } }))
  }), /berulang/)
  await assert.rejects(getSchoolSerialNumbers(npsn, async function* () { yield [{ serial_number: ids[0], npsn_info: { npsn } }]; throw new Error('Missing next page') }))
  await assert.rejects(getSchoolSerialNumbers(npsn, async function* () { yield [{ npsn_info: { npsn } }] }))
  await assert.rejects(getSchoolSerialNumbers(npsn, async function* () { yield [] }))
  assert.deepEqual(countSchoolProgress(ids, []), { scanned: 0, total: 3 })
  const [{ id: userId }] = await db.insert(users).values({ username: key, role: 'Internal', passwordHash: await hashPassword(password) }).$returningId()
  for (const [i, vendor] of (['Hisense', 'Hisense', 'Skylink'] as const).entries()) {
    const [{ id }] = await db.insert(bappStorages).values({ name: `${key}-${i}`, type: 'Dus', vendor, createdBy: userId }).$returningId()
    storageIds.push(id)
  }
  await db.insert(bappSchoolCounts).values({ npsn, serialNumbers: ids, status: 'ready', checkedAt: new Date() })
  await db.insert(bappSchoolCounts).values({ npsn: otherSchool, transactionIds: ['OLD-TX'], status: 'ready', checkedAt: new Date() })
  const legacy = (await loadSchoolProgress([otherSchool])).get(otherSchool)!
  assert.equal(legacy.status, 'pending', 'Legacy transaction cache must be refreshed using serial numbers')
  assert.equal(legacy.total, null)
  assert.equal((await loadSchoolProgress([npsn])).get(npsn)?.scanned, 0)
  const insert = (barcode: string, storageId = storageIds[0], validationStatus: 'valid' | 'invalid' = 'valid', school = npsn) => db.insert(bappScans).values({ storageId, barcode, requestId: randomUUID(), scannedBy: userId, validationStatus, npsn: school }).$returningId()
  let scanId = 0
  for (const [i, barcode] of ids.entries()) {
    const [row] = await insert(barcode, storageIds[i % 2])
    scanId ||= row.id
    const progress = (await loadSchoolProgress([npsn])).get(npsn)!
    assert.equal(progress.scanned, i + 1)
    assert.equal(progress.total, 3)
    await insert(barcode)
    assert.equal((await loadSchoolProgress([npsn])).get(npsn)?.scanned, i + 1, 'Duplicate must not advance count')
  }
  await insert('unknown-id')
  await insert(ids[0], storageIds[2])
  await insert('invalid-id', storageIds[0], 'invalid')
  await insert(ids[0], storageIds[0], 'valid', otherSchool)
  assert.equal((await loadSchoolProgress([npsn])).get(npsn)?.scanned, 3)
  const login = await fetch('http://localhost:3001/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: key, password }) })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie')!.split(';')[0]
  const getRows = async () => (await fetch(`http://localhost:3001/api/bapp-fisik/storages/${storageIds[0]}/scans`, { headers: { cookie } })).json() as Promise<any>
  const rows = await getRows()
  const row = rows.data.find((item: any) => item.id === scanId)
  assert.deepEqual({ scanned: row.schoolProgress.scanned, total: row.schoolProgress.total }, { scanned: 3, total: 3 })
  // Failed totals must never be presented as 0 or as a stale completed fraction.
  const claimedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
  await db.update(bappSchoolCounts).set({ status: 'checking', claimedAt }).where(eq(bappSchoolCounts.npsn, npsn))
  await syncClaimedSchoolCount(npsn, claimedAt, async () => { throw new Error('Upstream unavailable') })
  const errorProgress = (await loadSchoolProgress([npsn])).get(npsn)!
  assert.equal(errorProgress.status, 'error')
  assert.equal(errorProgress.total, null)
  assert.equal(errorProgress.scanned, null)
  const retry = await fetch(`http://localhost:3001/api/bapp-fisik/storages/${storageIds[0]}/scans/${scanId}/school-recheck`, { method: 'POST', headers: { cookie } })
  assert.equal(retry.status, 200)
  console.log('PASS: complete paginated school lookup, exact NPSN filtering, unique IDs, 0/3 → 1/3 → 2/3 → 3/3, cross-storage scans, duplicates, vendor isolation, errors and retry.')
  if (process.argv.includes('--live')) {
    const sample = await getHisenseTransactions({ limit: '1', page: '1' }, 'smk', { bypassCache: true })
    const school = sample.data[0]?.npsn_info?.npsn
    const id = sample.data[0]?.serial_number
    assert.ok(school && id)
    const schoolIds = await getSchoolSerialNumbers(school)
    assert.ok(schoolIds.includes(id))
    assert.equal(new Set(schoolIds).size, schoolIds.length)
    console.log(`PASS: live Hisense NPSN lookup returned ${schoolIds.length} unique transactions, including the sampled transaction.`)
  }
} finally {
  if (storageIds.length) {
    await db.delete(bappScans).where(inArray(bappScans.storageId, storageIds))
    await db.delete(bappStorages).where(inArray(bappStorages.id, storageIds))
  }
  await db.delete(bappSchoolCounts).where(inArray(bappSchoolCounts.npsn, [npsn, otherSchool]))
  await db.delete(activityLogs).where(eq(activityLogs.username, key))
  await db.delete(users).where(eq(users.username, key))
  await pool.end()
}
