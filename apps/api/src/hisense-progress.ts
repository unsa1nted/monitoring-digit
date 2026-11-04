import { getHisenseSmkPages, type HisenseTransaction } from './hisense.js'
import { provinceKey } from './province-statistics.js'
import { provinceNames } from '../../../shared/province-names.js'
import { hisenseProgressStatuses, type HisenseProgressSummary, type HisenseProgressResponse, type HisenseSchoolProgress } from '../../../shared/hisense-progress.js'

const cacheSeconds = 60
let cached: { value: HisenseProgressResponse; expiresAt: number } | undefined
let inFlight: Promise<HisenseProgressResponse> | undefined
const knownCodes = hisenseProgressStatuses.map(status => status.code as string)
// BARANG SIAP already means departure from Crossdock per the API documentation.
// PENGIRIMAN GAGAL alone does not prove departure (a shipment can be voided).
const shippedCodes = new Set(knownCodes.filter(code => code !== 'PENGIRIMAN GAGAL'))

function createBucket() {
  return { transactions: 0, schools: new Set<string>(), missingNpsn: 0, shipped: 0, statuses: new Map<string, number>() }
}
type Bucket = ReturnType<typeof createBucket>

function add(bucket: Bucket, item: HisenseTransaction, status: string) {
  bucket.transactions++
  const npsn = item.npsn_info?.npsn?.trim()
  if (npsn) bucket.schools.add(npsn)
  else bucket.missingNpsn++
  bucket.statuses.set(status, (bucket.statuses.get(status) ?? 0) + 1)
  const hasShippingTimestamp = ['waktu_barang_siap', 'waktu_proses_pengiriman', 'waktu_menuju_alamat', 'waktu_barang_tiba']
    .some(key => typeof item[key] === 'string' && Number.isFinite(Date.parse(item[key] as string)))
  if (shippedCodes.has(status) || hasShippingTimestamp) bucket.shipped++
}

function summarize(bucket: Bucket): HisenseProgressSummary {
  const count = (code: string) => bucket.statuses.get(code) ?? 0
  const extra = [...bucket.statuses.keys()].filter(code => !knownCodes.includes(code)).sort()
  return {
    transactions: bucket.transactions, schools: bucket.schools.size, missingNpsn: bucket.missingNpsn,
    shipped: bucket.shipped,
    installationComplete: count('INSTALASI SELESAI'),
    failed: count('PENGIRIMAN GAGAL') + count('INSTALASI GAGAL'),
    constrained: count('INSTALASI TERKENDALA'), revision: count('REVISI'),
    statuses: [...knownCodes, ...extra].map(code => ({ code, count: count(code), percentage: bucket.transactions ? count(code) / bucket.transactions * 100 : 0 }))
  }
}

async function fetchProgress(): Promise<HisenseProgressResponse> {
  const total = createBucket()
  const provinces = new Map(provinceNames.map(name => [provinceKey(name), { name: name as string, mapped: true, bucket: createBucket() }]))
  const seen = new Set<string>()
  const schoolsByProvince = new Map<string, Map<string, HisenseSchoolProgress>>()
  for await (const page of getHisenseSmkPages()) {
    for (const item of page) {
      if (item.kode_direktorat && item.kode_direktorat.trim().toUpperCase() !== 'SMK') {
        throw new Error('Respons Hisense berisi data di luar Direktorat SMK.')
      }
      const id = item.id_transaksi?.trim()
      if (!id || seen.has(id)) {
        throw new Error('ID transaksi Hisense kosong atau berulang saat pagination. Silakan muat ulang statistik.')
      }
      seen.add(id)
      const name = item.npsn_info?.propinsi?.trim() || 'Provinsi tidak tersedia'
      const key = provinceKey(name)
      let province = provinces.get(key)
      if (!province) {
        province = { name, mapped: false, bucket: createBucket() }
        provinces.set(key, province)
      }
      const status = item.kode_status_progress?.trim().replace(/\s+/g, ' ').toUpperCase() || 'STATUS TIDAK TERSEDIA'
      add(total, item, status)
      add(province.bucket, item, status)
      const npsn = item.npsn_info?.npsn?.trim()
      if (npsn) {
        let schools = schoolsByProvince.get(key)
        if (!schools) { schools = new Map(); schoolsByProvince.set(key, schools) }
        let school = schools.get(npsn)
        if (!school) {
          school = { npsn, name: item.npsn_info?.nama_sekolah?.trim() || 'Nama sekolah tidak tersedia', pidCount: 0, statuses: [] }
          schools.set(npsn, school)
        }
        school.pidCount++
        const schoolStatus = school.statuses.find(entry => entry.code === status)
        if (schoolStatus) schoolStatus.count++
        else school.statuses.push({ code: status, count: 1 })
      }
    }
  }
  return {
    source: 'SMK', fetchedAt: new Date().toISOString(), cacheSeconds, summary: summarize(total),
    provinces: [...provinces].map(([key, province]) => ({
      key, name: province.name, mapped: province.mapped, ...summarize(province.bucket),
      schoolDetails: [...(schoolsByProvince.get(key)?.values() ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name, 'id') || a.npsn.localeCompare(b.npsn))
    }))
  }
}

export async function getHisenseProvinceProgress() {
  if (cached && cached.expiresAt > Date.now()) return cached.value
  if (!inFlight) {
    inFlight = fetchProgress().then(value => {
      cached = { value, expiresAt: Date.now() + cacheSeconds * 1000 }
      return value
    }).finally(() => { inFlight = undefined })
  }
  return inFlight
}
