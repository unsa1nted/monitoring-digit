import '../src/config.js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { inArray } from 'drizzle-orm'
import ExcelJS from 'exceljs'
import { db, pool } from '../src/db/index.js'
import { users, bappStorages, bappScans, bappSchoolCounts, activityLogs } from '../src/db/schema.js'
import { hashPassword } from '../src/password.js'

const base = process.env.TEST_WEB_ORIGIN ?? 'http://localhost:3001'
const key = `report_${randomUUID().slice(0, 8)}`
const names = [`${key}_admin`, `${key}_internal`, `${key}_dinas`]
const schoolIds = [`0${key}1`, `0${key}2`]
const storageIds: number[] = []
const password = randomUUID()
let browser: any
async function req(path: string, cookie?: string) { return fetch(base + path, { headers: cookie ? { cookie } : {} }) }
async function login(username: string) {
  const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) })
  assert.equal(response.status, 200)
  return response.headers.get('set-cookie')!.split(';')[0]
}
try {
  const passwordHash = await hashPassword(password)
  const createdUsers = await db.insert(users).values([{ username: names[0], role: 'Admin', passwordHash }, { username: names[1], role: 'Internal', passwordHash }, { username: names[2], role: 'Dinas', passwordHash, province: 'Aceh' }]).$returningId()
  for (const [i, vendor] of (['Hisense', 'Hisense', 'PLN'] as const).entries()) {
    const [{ id }] = await db.insert(bappStorages).values({ name: `=${key}-${i}`, type: 'Dus', vendor, createdBy: createdUsers[1].id }).$returningId()
    storageIds.push(id)
  }
  const expectedA = [`000${key}A1`, `000${key}A2`, `000${key}A3`]
  const expectedB = [`000${key}B1`, `000${key}B2`]
  await db.insert(bappSchoolCounts).values([{ npsn: schoolIds[0], status: 'ready', transactionIds: expectedA, checkedAt: new Date() }, { npsn: schoolIds[1], status: 'ready', transactionIds: expectedB, checkedAt: new Date() }])
  const insert = (barcode: string, storageId: number, npsn: string | null, status: 'valid' | 'unsupported' = 'valid') => db.insert(bappScans).values({ barcode, storageId, npsn, validationStatus: status, schoolName: npsn ? `${key} school` : null, requestId: randomUUID(), scannedBy: createdUsers[1].id })
  await insert(expectedA[0], storageIds[0], schoolIds[0])
  await insert(expectedA[1], storageIds[0], schoolIds[0])
  await insert(expectedA[2], storageIds[1], schoolIds[0])
  await insert(expectedB[0], storageIds[1], schoolIds[1])
  await insert(`000${key}PLN`, storageIds[2], null, 'unsupported')
  await db.insert(bappScans).values(Array.from({ length: 51 }, () => ({ barcode: expectedA[0], storageId: storageIds[0], npsn: schoolIds[0], validationStatus: 'valid' as const, schoolName: `${key} school`, requestId: randomUUID(), scannedBy: createdUsers[1].id })))
  const search = `search=${encodeURIComponent(key)}`
  for (const path of ['/api/bapp-report', '/api/bapp-report/export']) assert.equal((await req(path)).status, 401)
  const dinas = await login(names[2])
  for (const path of ['/api/bapp-report', '/api/bapp-report/export']) assert.equal((await req(path, dinas)).status, 403)
  for (const name of names.slice(0, 2)) {
    const cookie = await login(name)
    const response = await req(`/api/bapp-report?${search}`, cookie)
    assert.equal(response.status, 200)
    const report = await response.json() as any
    assert.equal(report.totalRows, 56)
    assert.equal(report.data.length, 50)
    assert.equal(report.summary.uniqueTransactions, 5)
    assert.equal(report.summary.totalPid, 5)
    assert.equal(report.summary.completePid, 4)
    assert.equal(report.summary.incompletePid, 1)
    assert.equal(report.summary.completeSchools, 1)
    assert.equal(report.summary.incompleteSchools, 1)
    assert.equal(report.summary.unknownTransactions, 1)
    const page2 = await (await req(`/api/bapp-report?${search}&page=2`, cookie)).json() as any
    assert.equal(page2.data.length, 6)
    const storageReport = await (await req(`/api/bapp-report?storage=${storageIds[0]}`, cookie)).json() as any
    assert.equal(storageReport.summary.totalPid, 3)
    assert.equal(storageReport.summary.completePid, 3, 'School completion must include scans in other storages')
    assert.ok(storageReport.data.every((row: any) => row.storageId === storageIds[0]))
    const incomplete = await (await req(`/api/bapp-report?${search}&completion=incomplete`, cookie)).json() as any
    assert.equal(incomplete.totalRows, 1)
    const unknown = await (await req(`/api/bapp-report?${search}&vendor=PLN`, cookie)).json() as any
    assert.equal(unknown.summary.totalPid, 0)
    assert.equal(unknown.summary.unknownTransactions, 1)
    assert.equal((await req('/api/bapp-report?completion=invalid', cookie)).status, 422)
    const file = await req(`/api/bapp-report/export?${search}`, cookie)
    assert.equal(file.status, 200)
    assert.match(file.headers.get('content-type')!, /spreadsheetml/)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await file.arrayBuffer())
    assert.equal(workbook.worksheets.length, 3)
    const tx = workbook.getWorksheet('Transaksi')!
    assert.equal(tx.rowCount, 57, 'Export includes every filtered row, not just page one')
    assert.equal(tx.getCell('C2').value, expectedA[0])
    assert.equal(tx.getCell('D2').value, schoolIds[0], 'Leading zero NPSN stays text')
    assert.equal(tx.getCell('H2').type, ExcelJS.ValueType.String, 'User text beginning with = is not an Excel formula')
    const summary = new Map(workbook.getWorksheet('Ringkasan')!.getRows(2, 20)!.map(row => [row.getCell(1).value, row.getCell(2).value]))
    assert.equal(summary.get('Total PID diketahui'), 5)
    assert.equal(summary.get('PID: BAPP sudah terscan'), 4)
    assert.equal(summary.get('PID: BAPP belum terscan'), 1)
    assert.equal(workbook.getWorksheet('Rekap Sekolah')!.rowCount, 3)
  }
  console.log('PASS: Admin/Internal access; Dinas/anonymous rejected; storage/vendor/completion/search filters; PID counts without duplicates; pagination; full XLSX export; leading zeros and formula-safe text.')
  if (process.argv[2]) {
    const { chromium } = await import(process.argv[2])
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    page.setDefaultTimeout(20000)
    const errors: string[] = []
    page.on('pageerror', (error: Error) => errors.push(error.message))
    for (const username of names.slice(0, 2)) {
      await page.context().clearCookies()
      await page.request.post(base + '/api/auth/login', { data: { username, password } })
      await page.goto(base + '/rekap-scan')
      await page.getByRole('heading', { name: 'Rekap Scan BAPP', exact: true }).waitFor()
      await page.locator('#report-search').fill(key)
      await page.getByRole('button', { name: 'Terapkan Filter', exact: true }).click()
      await page.getByText('56 scan · 5 transaksi unik', { exact: false }).waitFor()
      await page.locator('#report-storage').selectOption(String(storageIds[0]))
      await page.getByRole('button', { name: 'Terapkan Filter', exact: true }).click()
      await page.getByText('53 scan · 2 transaksi unik', { exact: false }).waitFor()
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Export Excel', exact: true }).click()
      const download = await downloadPromise
      assert.equal(download.suggestedFilename(), 'rekap-scan-bapp.xlsx')
      assert.equal(await download.failure(), null)
    }
    await page.screenshot({ path: 'artifacts/bapp-report-test.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.deepEqual(errors, [])
    console.log('PASS: Admin/Internal page, filter controls, actual Excel download, mobile layout, no browser errors.')
  }
} finally {
  await browser?.close()
  if (storageIds.length) {
    await db.delete(bappScans).where(inArray(bappScans.storageId, storageIds))
    await db.delete(bappStorages).where(inArray(bappStorages.id, storageIds))
  }
  await db.delete(bappSchoolCounts).where(inArray(bappSchoolCounts.npsn, schoolIds))
  await db.delete(activityLogs).where(inArray(activityLogs.username, names))
  await db.delete(users).where(inArray(users.username, names))
  await pool.end()
}
