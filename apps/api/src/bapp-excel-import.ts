import ExcelJS from 'exceljs'

const allowedStatuses = new Set(['DISETUJUI', 'INSTALASI SELESAI', 'REVISI', 'SESUAI APIP', 'REVIU APIP'])
const requiredHeaders = ['ID Transaksi', 'Resubmit', 'Status Progress', 'NPSN', 'Nama Sekolah', 'Propinsi', 'Kabupaten/Kota', 'Kecamatan', 'Serial Number', 'Reviewer MOE', 'Reviewer MOE Revisi']
const headerKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()

const reviewPhotoHeaders = [
  ['Foto Plang Sekolah', 'fotoPlangSekolah'],
  ['Foto Box & PIC', 'fotoBoxPic'],
  ['Foto Kelengkapan Unit', 'fotoKelengkapanUnit'],
  ['Foto Proses Instalasi', 'fotoProsesInstalasi'],
  ['Foto Kesesuaian Serial Number', 'fotoKesesuaianSerialNumber'],
  ['Foto Training & Capture Rumah Pendidikan', 'fotoTrainingRumahPendidikan'],
  ['Foto BAPP 1', 'fotoBapp1'],
  ['Foto BAPP 2', 'fotoBapp2']
] as const
type PhotoField = (typeof reviewPhotoHeaders)[number][1]
export type BappReviewImportRow = { serialNumber: string; idTransaksi: string; petugasReviu: string; photos: Record<PhotoField, 'Ya' | 'Tidak' | null>; hasilAkhirReviu: 'Sesuai' | 'Tidak Sesuai' | null }
const reviewHeaderKey = (value: string) => headerKey(value).replace(/\s*\(\d+\)$/, '').trim()

export async function parseBappReviewExcel(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const needed = ['ID Transaksi', 'Serial Number', 'Petugas Reviu', ...reviewPhotoHeaders.map(([header]) => header), 'Hasil Akhir Reviu']
  const sheet = workbook.worksheets.find(candidate => {
    const headers = new Set<string>()
    candidate.getRow(1).eachCell(cell => headers.add(reviewHeaderKey(cell.text)))
    return needed.every(header => headers.has(reviewHeaderKey(header)))
  })
  if (!sheet) throw new Error(`Sheet hasil reviu tidak ditemukan. Header wajib: ${needed.join(', ')}.`)
  const columns = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, column) => columns.set(reviewHeaderKey(cell.text), column))
  const rows: BappReviewImportRow[] = []
  const seen = new Set<string>()
  let skippedDuplicate = 0
  for (let number = 2; number <= sheet.rowCount; number++) {
    const row = sheet.getRow(number)
    if (!row.hasValues) continue
    const get = (header: string) => {
      const cell = row.getCell(columns.get(reviewHeaderKey(header))!)
      const value = cell.value
      return (value && typeof value === 'object' && 'result' in value ? String(value.result ?? '') : cell.text).trim()
    }
    const idTransaksi = get('ID Transaksi')
    if (seen.has(idTransaksi)) { skippedDuplicate++; continue }
    const serialNumber = get('Serial Number')
    if (!serialNumber || !idTransaksi) throw new Error(`Baris ${number}: Serial Number dan ID Transaksi wajib diisi.`)
    seen.add(idTransaksi)
    const photos = {} as BappReviewImportRow['photos']
    for (const [header, field] of reviewPhotoHeaders) {
      const value = get(header).toLowerCase().replace(/\s+/g, ' ')
      if (!value) photos[field] = null
      else if (value === 'ya' || value === 'sesuai') photos[field] = 'Ya'
      else if (value === 'tidak' || value === 'tidak sesuai') photos[field] = 'Tidak'
      else throw new Error(`Baris ${number}: ${header} harus Ya, Tidak, Sesuai, Tidak Sesuai, atau kosong.`)
    }
    const result = get('Hasil Akhir Reviu').toLowerCase().replace(/\s+/g, ' ')
    if (result && result !== 'sesuai' && result !== 'tidak sesuai') throw new Error(`Baris ${number}: Hasil Akhir Reviu tidak valid.`)
    const values = Object.values(photos)
    const calculated = values.includes('Tidak') ? 'Tidak Sesuai' : values.every(value => value === 'Ya') ? 'Sesuai' : null
    if (result && calculated && result !== calculated.toLowerCase()) throw new Error(`Baris ${number}: Hasil Akhir Reviu tidak cocok dengan penilaian foto.`)
    rows.push({ serialNumber, idTransaksi, petugasReviu: get('Petugas Reviu'), photos, hasilAkhirReviu: result === 'sesuai' ? 'Sesuai' : result === 'tidak sesuai' ? 'Tidak Sesuai' : calculated })
  }
  return { rows, skippedDuplicate }
}

export async function parseBappExcel(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error('File Excel tidak memiliki sheet.')
  const columns = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, column) => columns.set(headerKey(cell.text), column))
  const missing = requiredHeaders.filter(header => !columns.has(headerKey(header)))
  if (missing.length) throw new Error(`Header Excel tidak lengkap: ${missing.join(', ')}.`)

  const rows: Array<{
    idTransaksi: string; sudahAdaRevisi: 'Ya' | 'Tidak'; statusProgress: string; npsn: string
    namaSekolah: string | null; propinsi: string | null; kabupatenKota: string | null
    kecamatan: string | null; serialNumber: string | null; petugasReviu: string
  }> = []
  const ids = new Set<string>()
  let skippedStatus = 0
  let skippedDuplicate = 0
  for (let number = 2; number <= sheet.rowCount; number++) {
    const row = sheet.getRow(number)
    if (!row.hasValues) continue
    const get = (header: string) => {
      const cell = row.getCell(columns.get(headerKey(header))!)
      const value = cell.value
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
      if (typeof value === 'number') return String(value)
      if (value && typeof value === 'object' && 'result' in value) return String(value.result ?? '').trim()
      return cell.text.trim()
    }
    const statusProgress = get('Status Progress').toUpperCase()
    if (!allowedStatuses.has(statusProgress)) { skippedStatus++; continue }
    const idTransaksi = get('ID Transaksi')
    if (ids.has(idTransaksi)) { skippedDuplicate++; continue }
    const npsnCell = row.getCell(columns.get('npsn')!)
    const npsn = typeof npsnCell.value === 'number' ? get('NPSN').padStart(8, '0') : get('NPSN')
    if (!idTransaksi || idTransaksi.length > 80 || !/^\d{8}$/.test(npsn)) throw new Error(`Baris ${number}: ID Transaksi atau NPSN tidak valid.`)
    ids.add(idTransaksi)
    const resubmit = get('Resubmit').toUpperCase()
    if (!['TRUE', 'FALSE', '1', '0', 'YA', 'TIDAK'].includes(resubmit)) throw new Error(`Baris ${number}: Resubmit harus TRUE atau FALSE.`)
    const bounded = (header: string, max: number) => {
      const value = get(header)
      if (value.length > max) throw new Error(`Baris ${number}: ${header} lebih dari ${max} karakter.`)
      return value || null
    }
    rows.push({
      idTransaksi,
      sudahAdaRevisi: ['TRUE', '1', 'YA'].includes(resubmit) ? 'Ya' : 'Tidak',
      statusProgress,
      npsn,
      namaSekolah: bounded('Nama Sekolah', 255),
      propinsi: bounded('Propinsi', 120),
      kabupatenKota: bounded('Kabupaten/Kota', 120),
      kecamatan: bounded('Kecamatan', 120),
      serialNumber: bounded('Serial Number', 160),
      petugasReviu: bounded(statusProgress === 'INSTALASI SELESAI' && ['TRUE', '1', 'YA'].includes(resubmit) ? 'Reviewer MOE Revisi' : 'Reviewer MOE', 80) ?? ''
    })
  }
  return { rows, skippedStatus, skippedDuplicate }
}
