import '../src/config.js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db, pool } from '../src/db/index.js'
import { bappScans, bappStorages, users, activityLogs } from '../src/db/schema.js'
import { hashPassword } from '../src/password.js'
import { validateClaimedBappScan } from '../src/bapp-validation.js'
import { getHisenseTransactions } from '../src/hisense.js'

const base = process.env.TEST_WEB_ORIGIN ?? 'http://localhost:3000'
const prefix = `scan_test_${randomUUID().slice(0, 8)}`
const names = [`${prefix}_internal`, `${prefix}_admin`, `${prefix}_dinas`]
const storageIds: number[] = []
const password = randomUUID()
async function request(path: string, method = 'GET', body?: unknown, cookie?: string) {
  return fetch(`${base}${path}`, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
}
async function login(username: string) {
  const response = await request('/api/auth/login', 'POST', { username, password })
  assert.equal(response.status, 200)
  return response.headers.get('set-cookie')!.split(';')[0]
}
try {
  const passwordHash = await hashPassword(password)
  const createdUsers = await db.insert(users).values([{ username: names[0], passwordHash, role: 'Internal' }, { username: names[1], passwordHash, role: 'Admin' }, { username: names[2], passwordHash, role: 'Dinas', province: 'Aceh' }]).$returningId()
  const internal = await login(names[0])
  for (const type of ['Dus', 'Kontainer', 'Penyimpanan Lainnya']) {
    const response = await request('/api/bapp-fisik/storages', 'POST', { name: `${prefix} ${type}`, type, vendor: 'Hisense' }, internal)
    assert.equal(response.status, 201)
    storageIds.push((await response.json() as any).data.id)
  }
  const path = `/api/bapp-fisik/storages/${storageIds[0]}/scans`
  assert.equal((await request(path)).status, 401)
  for (const name of names.slice(1)) {
    const cookie = await login(name)
    assert.equal((await request(path, 'GET', undefined, cookie)).status, 403)
    assert.equal((await request(path, 'POST', { barcode: 'forbidden', requestId: randomUUID() }, cookie)).status, 403)
  }
  assert.equal((await request(path, 'POST', { barcode: '  ', requestId: randomUUID() }, internal)).status, 400)
  assert.equal((await request(path, 'POST', { barcode: 'x', requestId: 'bad' }, internal)).status, 422)
  assert.equal((await request('/api/bapp-fisik/storages/999999999/scans', 'POST', { barcode: 'x', requestId: randomUUID() }, internal)).status, 404)
  const body = { barcode: `000-${prefix}`, requestId: randomUUID() }
  const retries = await Promise.all([request(path, 'POST', body, internal), request(path, 'POST', body, internal)])
  assert.deepEqual(retries.map(response => response.status).sort(), [200, 201])
  const ids = await Promise.all(retries.map(async response => (await response.json() as any).id))
  assert.equal(ids[0], ids[1], 'Retry must not insert twice')
  assert.equal((await request(path, 'POST', { ...body, barcode: 'different' }, internal)).status, 409)
  const duplicates = await Promise.all([0, 1].map(() => request(path, 'POST', { ...body, requestId: randomUUID() }, internal)))
  duplicates.forEach(response => assert.equal(response.status, 201))
  const secondPath = `/api/bapp-fisik/storages/${storageIds[1]}/scans`
  assert.equal((await request(secondPath, 'POST', { ...body, requestId: randomUUID() }, internal)).status, 201)
  const list = await (await request(path, 'GET', undefined, internal)).json() as any
  assert.deepEqual(list.summary, { totalScans: 3, documents: 1 })
  assert.ok(list.data.every((scan: any) => scan.occurrences === 4 && scan.barcode === body.barcode))
  const secondList = await (await request(secondPath, 'GET', undefined, internal)).json() as any
  assert.deepEqual(secondList.summary, { totalScans: 1, documents: 1 })
  assert.equal(secondList.data[0].occurrences, 4)
  assert.deepEqual(list.tabs, { details: 1, duplicates: 2 })
  assert.deepEqual(secondList.tabs, { details: 0, duplicates: 1 })
  const details = await (await request(`${path}?tab=details`, 'GET', undefined, internal)).json() as any
  assert.equal(details.totalRows, 1)
  assert.equal(details.data[0].id, ids[0])
  assert.equal(details.data[0].isDuplicate, false)
  await db.insert(bappScans).values(Array.from({ length: 49 }, () => ({ storageId: storageIds[0], barcode: body.barcode, requestId: randomUUID(), scannedBy: createdUsers[0].id, validationStatus: 'unsupported' as const })))
  const duplicatePage = await (await request(`${path}?tab=duplicates`, 'GET', undefined, internal)).json() as any
  assert.deepEqual(duplicatePage.tabs, { details: 1, duplicates: 51 })
  assert.equal(duplicatePage.totalRows, 51)
  assert.equal(duplicatePage.data.length, 50)
  assert.ok(duplicatePage.data.every((scan: any) => scan.isDuplicate))
  const lastPage = await (await request(`${path}?tab=duplicates&page=2`, 'GET', undefined, internal)).json() as any
  assert.equal(lastPage.data.length, 1)
  assert.equal((await request(`${path}?tab=invalid`, 'GET', undefined, internal)).status, 400)
  const browserModule = process.argv.find(value => value.startsWith('file:'))
  if (browserModule) {
    const { chromium } = await import(browserModule)
    const browser = await chromium.launch({ headless: true })
    try {
      const page = await browser.newPage()
      await page.request.post(base + '/api/auth/login', { data: { username: names[0], password } })
      await page.goto(base + '/bapp-fisik')
      await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
      await page.getByRole('button', { name: /Sudah Tersedia/ }).click()
      await page.getByRole('button', { name: `Pilih ${prefix} Dus dan lanjut scan`, exact: true }).click()
      await page.getByRole('tab', { name: 'Detail Transaksi (1)', exact: true }).waitFor()
      await page.waitForFunction(() => document.querySelectorAll('[data-scan-id]').length === 1)
      await page.getByRole('tab', { name: 'Data Duplikat (51)', exact: true }).click()
      await page.waitForFunction(() => document.querySelectorAll('[data-scan-id]').length === 50)
      await page.getByRole('button', { name: 'Berikutnya' }).click()
      await page.waitForFunction(() => document.querySelectorAll('[data-scan-id]').length === 1)
      await page.getByRole('tab', { name: 'Detail Transaksi (1)', exact: true }).click()
      await page.locator('#barcode').fill(`${prefix}_browser`)
      await page.locator('#barcode').press('Enter')
      await page.getByRole('tab', { name: 'Detail Transaksi (2)', exact: true }).waitFor()
      await page.locator('#barcode').fill(`${prefix}_browser`)
      await page.locator('#barcode').press('Enter')
      await page.getByRole('tab', { name: 'Data Duplikat (52)', exact: true }).waitFor()
      assert.equal(await page.getByRole('tab', { name: 'Data Duplikat (52)', exact: true }).getAttribute('aria-selected'), 'true')
      assert.equal(await page.locator('#barcode').evaluate((element: Element) => document.activeElement === element), true)
      await page.screenshot({ path: 'artifacts/bapp-scan-tabs-test.png', fullPage: true })
      console.log('PASS: browser tabs, counts, pagination, live new/duplicate scans and scanner focus.')
    } finally { await browser.close() }
  }
  assert.equal((await request(`${secondPath}/${ids[0]}/recheck`, 'POST', undefined, internal)).status, 404)
  assert.equal((await request(`${path}?page=0`, 'GET', undefined, internal)).status, 400)

  // Deterministic verification outcomes without depending on upstream availability.
  for (const outcome of ['valid', 'invalid', 'error'] as const) {
    const claimedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
    const barcode = `${prefix}_${outcome}`
    const [{ id }] = await db.insert(bappScans).values({ storageId: storageIds[2], barcode, requestId: randomUUID(), scannedBy: createdUsers[0].id, validationStatus: 'checking', claimedAt }).$returningId()
    await validateClaimedBappScan({ id, barcode }, claimedAt, async () => {
      if (outcome === 'error') throw new Error('Simulated Hisense timeout')
      return outcome === 'valid' ? { id_transaksi: barcode, npsn_info: { npsn: '00000123', nama_sekolah: 'Test school' } } : null
    })
    const [row] = await db.select().from(bappScans).where(eq(bappScans.id, id))
    assert.equal(row.validationStatus, outcome)
    assert.ok(row.checkedAt)
    if (outcome === 'valid') assert.equal(row.npsn, '00000123')
    if (outcome === 'error') {
      assert.equal((await request(`/api/bapp-fisik/storages/${storageIds[2]}/scans/${id}/recheck`, 'POST', undefined, internal)).status, 200)
      const [requeued] = await db.select().from(bappScans).where(eq(bappScans.id, id))
      assert.ok(['pending', 'checking'].includes(requeued.validationStatus))
    }
  }
  console.log('PASS: persistence, role restrictions, idempotent retries, concurrent scans, global duplicates, unique counts, validation outcomes and recheck.')

  if (process.env.TEST_HISENSE_LIVE === '1' || process.argv.includes('--live')) {
    const sample = await getHisenseTransactions({ limit: '1', page: '1' }, 'smk', { bypassCache: true })
    const barcode = sample.data[0]?.id_transaksi
    assert.ok(barcode, 'Live Hisense must return a sample transaction')
    const response = await request(path, 'POST', { barcode, requestId: randomUUID() }, internal)
    assert.equal(response.status, 201)
    const { id } = await response.json() as any
    const deadline = Date.now() + 120_000
    let status = 'pending'
    while (Date.now() < deadline) {
      const [scan] = await db.select().from(bappScans).where(eq(bappScans.id, id))
      status = scan.validationStatus
      if (!['pending', 'checking'].includes(status)) break
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    assert.equal(status, 'valid', 'A real Hisense transaction must validate through the running worker')
    console.log('PASS: real Hisense API transaction verified by background worker.')
  }
} finally {
  if (storageIds.length) {
    await db.delete(bappScans).where(inArray(bappScans.storageId, storageIds))
    await db.delete(bappStorages).where(inArray(bappStorages.id, storageIds))
  }
  await db.delete(activityLogs).where(inArray(activityLogs.username, names))
  await db.delete(users).where(inArray(users.username, names))
  await pool.end()
}
