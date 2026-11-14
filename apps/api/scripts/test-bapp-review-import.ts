import '../src/config.js'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { parseBappReviewExcel } from '../src/bapp-excel-import.js'
import { prepareReviewImportReviewers } from '../src/bapp-review.js'

const headers = ['No', 'ID Transaksi', 'Serial Number', 'Petugas Reviu', 'Foto Plang Sekolah\n(1)', 'Foto Box & PIC\n(2)', 'Foto Kelengkapan Unit\n(3)', 'Foto Proses Instalasi\n(4)', 'Foto Kesesuaian Serial Number\n(5)', 'Foto Training &\nCapture Rumah Pendidikan\n(6)', 'Foto BAPP 1\n(7)', 'Foto BAPP 2\n(8)', 'Hasil Akhir Reviu']
const workbook = new ExcelJS.Workbook()
workbook.addWorksheet('Lainnya').addRow(['Tidak terkait'])
const sheet = workbook.addWorksheet('Reviu')
sheet.addRow(headers)
sheet.addRow([1, 'TX1', 'SN1', 'Petugas A', 'Sesuai', 'Tidak Sesuai', '', 'Ya', 'Tidak', 'Ya', 'Ya', 'Ya', 'Tidak Sesuai'])
sheet.addRow([2, 'TX2', 'SN2', 'petugas.b', 'Ya', 'Ya', 'Ya', 'Ya', 'Ya', 'Ya', 'Ya', 'Ya', ''])
sheet.addRow([3, 'TX1', 'SN1', 'Petugas B', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak Sesuai'])
const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
const parsed = await parseBappReviewExcel(buffer)
const rows = parsed.rows
assert.equal(rows.length, 2)
assert.equal(parsed.skippedDuplicate, 1)
assert.equal(rows[0].petugasReviu, 'Petugas A')
assert.equal(rows[0].photos.fotoPlangSekolah, 'Ya')
assert.equal(rows[0].photos.fotoBoxPic, 'Tidak')
assert.equal(rows[0].photos.fotoKelengkapanUnit, null)
assert.equal(rows[0].hasilAkhirReviu, 'Tidak Sesuai')
assert.equal(rows[1].hasilAkhirReviu, 'Sesuai')
const reviewers = prepareReviewImportReviewers([
  { idTransaksi: 'TX1', petugasReviu: rows[0].petugasReviu },
  { idTransaksi: 'TX2', petugasReviu: rows[1].petugasReviu },
  { idTransaksi: 'TX3', petugasReviu: '' },
  { idTransaksi: 'TX4', petugasReviu: 'Tidak terdaftar' }
], [{ userPetugas: 'petugas.a', namaPetugas: 'Petugas A' }, { userPetugas: 'petugas.b', namaPetugas: 'Petugas B' }])
assert.deepEqual([...reviewers.usernamesByTransaction], [['TX1', 'petugas.a'], ['TX2', 'petugas.b']])
assert.deepEqual([reviewers.missing, reviewers.unregistered], [1, 1])
sheet.getRow(2).getCell(13).value = 'Sesuai'
await assert.rejects(parseBappReviewExcel(Buffer.from(await workbook.xlsx.writeBuffer())), /tidak cocok/)
console.log('BAPP review import passed')
