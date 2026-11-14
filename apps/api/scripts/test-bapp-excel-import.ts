import '../src/config.js'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { Elysia, t } from 'elysia'
import { parseBappExcel } from '../src/bapp-excel-import.js'
import { distributeNewBappRows, lockedBappReviewStatuses, prepareAutoAssignments } from '../src/bapp-review.js'

const workbook = new ExcelJS.Workbook()
const sheet = workbook.addWorksheet('BAPP')
sheet.addRow(['ID Transaksi', 'Resubmit', 'Status Progress', 'NPSN', 'Nama Sekolah', 'Propinsi', 'Kabupaten/Kota', 'Kecamatan', 'Serial Number', 'Reviewer MOE', 'Reviewer MOE   Revisi', 'Tag Revisi'])
sheet.addRow(['HI-A', true, 'INSTALASI SELESAI', 1234567, 'Sekolah A', 'Aceh', 'Kota A', 'Kecamatan A', 'SN-A', 'reviewer.a', 'reviewer.revisi', 'Tag dari Excel'])
sheet.addRow(['HI-B', false, 'DISETUJUI', '87654321', 'Sekolah B', 'Jawa Barat', 'Kota B', 'Kecamatan B', 'SN-B', 'reviewer.b', 'reviewer.lain', 'Tag lain'])
sheet.addRow(['HI-C', true, 'PROSES INSTALASI', '11111111', 'Sekolah C', '', '', '', '', '', '', ''])
sheet.addRow(['HI-D', false, 'REVIU APIP', '22222222', 'Sekolah D', '', '', '', '', 'reviewer.d', '', ''])
const result = await parseBappExcel(Buffer.from(await workbook.xlsx.writeBuffer()))
const app = new Elysia().post('/upload', ({ body }) => ({ name: body.file.name }), { body: t.Object({ file: t.File() }) })
const form = new FormData()
form.append('file', new File([await workbook.xlsx.writeBuffer() as BlobPart], 'bapp.xlsx'))
const response = await app.handle(new Request('http://localhost/upload', { method: 'POST', body: form }))
assert.equal(response.status, 200)
assert.equal((await response.json() as { name: string }).name, 'bapp.xlsx')
assert.equal(result.skippedStatus, 1)
assert.deepEqual(result.rows.map(row => [row.idTransaksi, row.npsn, row.sudahAdaRevisi, row.petugasReviu]), [
  ['HI-A', '01234567', 'Ya', 'reviewer.revisi'],
  ['HI-B', '87654321', 'Tidak', 'reviewer.b'],
  ['HI-D', '22222222', 'Tidak', 'reviewer.d']
])
assert.ok(result.rows.every(row => !('tag' in row)))
assert.deepEqual(prepareAutoAssignments(result.rows, [{ userPetugas: 'reviewer.revisi' }, { userPetugas: 'reviewer.b' }, { userPetugas: 'reviewer.d' }]).rows, [
  { npsn: '01234567', userPetugas: 'reviewer.revisi' },
  { npsn: '87654321', userPetugas: 'reviewer.b' },
  { npsn: '22222222', userPetugas: 'reviewer.d' }
])
assert.deepEqual(['DISETUJUI', 'SESUAI APIP', 'REVIU APIP'].map(status => lockedBappReviewStatuses.has(status)), [true, true, true])
assert.equal(lockedBappReviewStatuses.has('INSTALASI SELESAI'), false)
const newRows = Array.from({ length: 10 }, (_, index) => ({ idTransaksi: `NEW-${index}` }))
const allocations = distributeNewBappRows(newRows, [
  { userPetugas: 'reviewer.a', alokasiPersen: 20 },
  { userPetugas: 'reviewer.b', alokasiPersen: null },
  { userPetugas: 'reviewer.c', alokasiPersen: null }
])
assert.deepEqual(['reviewer.a', 'reviewer.b', 'reviewer.c'].map(username => [...allocations.values()].filter(value => value === username).length), [2, 4, 4])
assert.deepEqual([...distributeNewBappRows(newRows.slice(0, 3), [
  { userPetugas: 'reviewer.a', alokasiPersen: null },
  { userPetugas: 'reviewer.b', alokasiPersen: null },
  { userPetugas: 'reviewer.c', alokasiPersen: null }
]).values()].sort(), ['reviewer.a', 'reviewer.b', 'reviewer.c'])
assert.throws(() => distributeNewBappRows(newRows, [{ userPetugas: 'reviewer.a', alokasiPersen: 101 }]), /Total persentase/)
sheet.addRow(['HI-A', true, 'REVISI', '12345678', '', '', '', '', '', '', '', ''])
const duplicate = await parseBappExcel(Buffer.from(await workbook.xlsx.writeBuffer()))
assert.equal(duplicate.skippedDuplicate, 1)
assert.deepEqual(duplicate.rows, result.rows)
console.log('BAPP Excel import passed')
