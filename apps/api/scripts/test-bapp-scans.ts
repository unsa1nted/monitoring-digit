import '../src/config.js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db, pool } from '../src/db/index.js'
import { bappScans, bappStorages, bappFolders, users, activityLogs } from '../src/db/schema.js'
import { hashPassword } from '../src/password.js'
import { validateClaimedBappScan } from '../src/bapp-validation.js'
import { getHisenseTransactions } from '../src/hisense.js'

const base = process.env.TEST_WEB_ORIGIN ?? 'http://localhost:3001'
const prefix = `scan_test_${randomUUID().slice(0, 8)}`
const names = [`${prefix}_internal`, `${prefix}_admin`, `${prefix}_dinas`]
const storageIds: number[] = []
const folderIds = new Map<number, number>()
const password = randomUUID()
async function request(path: string, method = 'GET', body?: unknown, cookie?: string) {
  const storage = path.match(/^\/api\/bapp-fisik\/storages\/(\d+)\/scans$/)
  if (storage && method === 'POST' && body) body = { folderId: folderIds.get(Number(storage[1])) ?? 1, ...body as object }
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
  for (const storageId of storageIds) {
    const folderPath = `/api/bapp-fisik/storages/${storageId}/folders`
    const response = await request(folderPath, 'POST', { number: 1 }, internal)
    assert.equal(response.status, 201)
    folderIds.set(storageId, (await response.json() as any).data.id)
    assert.equal((await request(folderPath, 'POST', { number: 1 }, internal)).status, 409)
    assert.equal((await request(folderPath, 'POST', { number: 0 }, internal)).status, 422)
    assert.equal((await request(folderPath, 'POST', { number: 1.5 }, internal)).status, 422)
    const folders = await (await request(folderPath, 'GET', undefined, internal)).json() as any
    assert.equal(folders.data.length, 1)
    assert.equal(folders.data[0].number, 1)
  }
  assert.equal((await request(`/api/bapp-fisik/storages/${storageIds[0]}/folders`)).status, 401)
  assert.equal((await request(path, 'POST', { barcode: 'wrong-map', requestId: randomUUID(), folderId: folderIds.get(storageIds[1]) }, internal)).status, 400)
  const noFolder = await fetch(base + path, { method: 'POST', headers: { cookie: internal, 'content-type': 'application/json' }, body: JSON.stringify({ barcode: 'missing-map', requestId: randomUUID() }) })
  assert.equal(noFolder.status, 422)
  assert.equal((await request(path)).status, 401)
  for (const name of names.slice(1)) {
    const cookie = await login(name)
    assert.equal((await request(`/api/bapp-fisik/storages/${storageIds[0]}/folders`, 'GET', undefined, cookie)).status, 403)
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
  assert.equal(list.data[0].folderNumber, 1)
  assert.equal((await request(`${path}?folderId=${folderIds.get(storageIds[1])}`, 'GET', undefined, internal)).status, 404)
  const map2 = await (await request(`/api/bapp-fisik/storages/${storageIds[0]}/folders`, 'POST', { number: 2 }, internal)).json() as any
  assert.equal((await request(path, 'POST', { ...body, folderId: map2.data.id }, internal)).status, 409, 'Retry cannot move a saved scan to another map')
  const emptyMap = await (await request(`${path}?folderId=${map2.data.id}`, 'GET', undefined, internal)).json() as any
  assert.equal(emptyMap.totalRows, 0)
  const map1 = await (await request(`${path}?folderId=${folderIds.get(storageIds[0])}`, 'GET', undefined, internal)).json() as any
  assert.equal(map1.totalRows, 3)
  assert.deepEqual(list.tabs, { details: 1, duplicates: 2 })
  assert.deepEqual(secondList.tabs, { details: 0, duplicates: 1 })
  const details = await (await request(`${path}?tab=details`, 'GET', undefined, internal)).json() as any
  assert.equal(details.totalRows, 1)
  assert.equal(details.data[0].id, ids[0])
  assert.equal(details.data[0].isDuplicate, false)
  await db.insert(bappScans).values(Array.from({ length: 49 }, () => ({ storageId: storageIds[0], folderId: folderIds.get(storageIds[0]), barcode: body.barcode, requestId: randomUUID(), scannedBy: createdUsers[0].id, validationStatus: 'unsupported' as const })))
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
      await page.getByRole('heading', { name: 'Pilih Map', exact: true }).waitFor()
      await page.getByRole('button', { name: 'Map 1', exact: true }).click()
      await page.getByRole('tab', { name: 'Detail Serial Number (1)', exact: true }).waitFor()
      await page.waitForFunction(() => document.querySelectorAll('[data-scan-id]').length === 1)
      await page.getByRole('tab', { name: 'Data Duplikat (51)', exact: true }).click()
      await page.waitForFunction(() => document.querySelectorAll('[data-scan-id]').length === 50)
      await page.getByRole('button', { name: 'Berikutnya' }).click()
      await page.waitForFunction(() => document.querySelectorAll('[data-scan-id]').length === 1)
      await page.getByRole('tab', { name: 'Detail Serial Number (1)', exact: true }).click()
      await page.locator('#barcode').fill(`${prefix}_browser`)
      await page.locator('#barcode').press('Enter')
      await page.getByRole('tab', { name: 'Detail Serial Number (2)', exact: true }).waitFor()
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
  const map2Scan = await request(path, 'POST', { barcode: body.barcode, requestId: randomUUID(), folderId: map2.data.id }, internal)
  assert.equal(map2Scan.status, 201)
  assert.equal((await map2Scan.json() as any).isDuplicate, true, 'Same serial in a different map remains a duplicate')
  const map2Rows = await (await request(`${path}?folderId=${map2.data.id}`, 'GET', undefined, internal)).json() as any
  assert.equal(map2Rows.totalRows, 1)
  assert.equal(map2Rows.data[0].folderNumber, 2)
  const admin = await login(names[1])
  const report = await (await request(`/api/bapp-report?storage=${storageIds[0]}`, 'GET', undefined, admin)).json() as any
  assert.equal(report.data[0].folderNumber, 2, 'Admin report preserves the map marker')

  // Deterministic verification outcomes without depending on upstream availability.
  for (const outcome of ['valid', 'invalid', 'error'] as const) {
    const claimedAt = new Date(Math.floor(Date.now() / 1000) * 1000)
    const barcode = `${prefix}_${outcome}`
    const [{ id }] = await db.insert(bappScans).values({ storageId: storageIds[2], barcode, requestId: randomUUID(), scannedBy: createdUsers[0].id, validationStatus: 'checking', claimedAt }).$returningId()
    await validateClaimedBappScan({ id, barcode }, claimedAt, async () => {
      if (outcome === 'error') throw new Error('Simulated Hisense timeout')
      return outcome === 'valid' ? { id_transaksi: 'different-transaction-id', serial_number: barcode, npsn_info: { npsn: '00000123', nama_sekolah: 'Test school' } } : null
    })
    const [row] = await db.select().from(bappScans).where(eq(bappScans.id, id))
    assert.equal(row.validationStatus, outcome)
    assert.ok(row.checkedAt)
    if (outcome === 'valid') assert.equal(row.npsn, '00000123')
    if (outcome === 'error') {
      assert.equal((await request(`/api/bapp-fisik/storages/${storageIds[2]}/scans/${id}/recheck`, 'POST', undefined, internal)).status, 200)
      const [rechecked] = await db.select().from(bappScans).where(eq(bappScans.id, id))
      assert.ok(['valid', 'invalid', 'error'].includes(rechecked.validationStatus))
    }
  }
  console.log('PASS: persistence, role restrictions, idempotent retries, concurrent scans, global duplicates, unique counts, validation outcomes and recheck.')

  if (process.env.TEST_HISENSE_LIVE === '1' || process.argv.includes('--live')) {
    const sample = await getHisenseTransactions({ limit: '1', page: '1' }, 'smk', { bypassCache: true })
    const barcode = sample.data[0]?.serial_number
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
    await db.delete(bappFolders).where(inArray(bappFolders.storageId, storageIds))
    await db.delete(bappStorages).where(inArray(bappStorages.id, storageIds))
  }
  await db.delete(activityLogs).where(inArray(activityLogs.username, names))
  await db.delete(users).where(inArray(users.username, names))
  await pool.end()
}
