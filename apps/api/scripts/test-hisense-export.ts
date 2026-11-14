import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { downloadHisenseSmkAllocationExcel, reviewHisenseAllocation } from '../src/hisense.js'
import { parseBappExcel } from '../src/bapp-excel-import.js'

const workbook = new ExcelJS.Workbook()
const sheet = workbook.addWorksheet('Alokasi')
sheet.addRow(['No', 'ID Transaksi', 'Resubmit', 'Status Progress', 'NPSN', 'Nama Sekolah', 'Propinsi', 'Kabupaten/Kota', 'Kecamatan', 'Serial Number', 'Reviewer MOE', 'Reviewer MOE Revisi'])
sheet.addRow([1, 'HI-1', false, 'INSTALASI SELESAI', '12345678', 'Sekolah', 'Jawa Barat', 'Bandung', 'Coblong', 'SN-1', 'lama', 'revisi'])
const xlsx = Buffer.from(await workbook.xlsx.writeBuffer())
process.env.HISENSE_SMK_USERNAME = 'test-user'
process.env.HISENSE_SMK_PASSWORD = 'test-password'
const originalFetch = globalThis.fetch
let logins = 0
let exports = 0
let reviews = 0
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input))
  if (url.pathname === '/api/hi-auth/login') {
    assert.deepEqual(JSON.parse(String(init?.body)), { username: 'test-user', password: 'test-password' })
    return Response.json({ token: `test-token-${++logins}` })
  }
  if (url.pathname === '/api/hi-transaksi/alokasi/review/HI-1') {
    assert.equal(init?.method, 'PUT')
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer test-token-${logins}`)
    assert.equal(new Headers(init.headers).get('x-active-batch'), '3')
    const body = JSON.parse(String(init.body))
    assert.equal(body.reviewer_name, 'Petugas Uji')
    if (++reviews === 1) return new Response(null, { status: 401 })
    if (reviews === 2) assert.deepEqual(body, { kode_status_progress: 'DISETUJUI', reviewer_name: 'Petugas Uji' })
    if (reviews === 3) assert.deepEqual(body, { kode_status_progress: 'REVISI', reviewer_name: 'Petugas Uji', tag_revisi: 'Foto Box Tidak Sesuai/Salah', catatan_revisi: 'Foto box salah' })
    return Response.json({ success: true })
  }
  assert.equal(url.pathname, '/api/hi-transaksi/alokasi/export')
  assert.equal(url.searchParams.get('kode_direktorat'), 'SMK')
  assert.equal(url.searchParams.get('format'), 'excel')
  assert.equal(new Headers(init?.headers).get('authorization'), `Bearer test-token-${logins}`)
  assert.equal(new Headers(init?.headers).get('x-active-batch'), '3')
  if (++exports === 2) return new Response(null, { status: 401 })
  return new Response(xlsx, { headers: { 'content-length': String(xlsx.length) } })
}
try {
  let received = 0
  const result = await parseBappExcel(await downloadHisenseSmkAllocationExcel(value => { received = value }))
  assert.equal(received, xlsx.length)
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0]?.sudahAdaRevisi, 'Tidak')
  assert.equal(result.rows[0]?.statusProgress, 'INSTALASI SELESAI')
  assert.equal(logins, 1)
  await downloadHisenseSmkAllocationExcel()
  assert.equal(logins, 2)
  await reviewHisenseAllocation('HI-1', { kode_status_progress: 'DISETUJUI', reviewer_name: 'Petugas Uji' })
  assert.equal(logins, 3)
  await reviewHisenseAllocation('HI-1', { kode_status_progress: 'REVISI', reviewer_name: 'Petugas Uji', tag_revisi: 'Foto Box Tidak Sesuai/Salah', catatan_revisi: 'Foto box salah' })
  assert.equal(reviews, 3)
  console.log('Hisense Excel export and review passed')
} finally {
  globalThis.fetch = originalFetch
  delete process.env.HISENSE_SMK_USERNAME
  delete process.env.HISENSE_SMK_PASSWORD
}
