const baseUrl = (process.env.HISENSE_BASE_URL ?? 'https://ifp-api.pyxscreen.co.id/api').replace(/\/$/, '')
const directorates = ['smk']

type HisenseListResponse = { success: boolean; meta?: { page_count?: number; current_page?: number; has_next_page?: boolean; item_count?: number; limit?: number }; data?: HisenseTransaction[]; message?: string }
export type HisenseTransaction = {
  id_transaksi?: string
  kode_direktorat?: string
  nama_batch?: string | null
  nama_termin?: string | null
  serial_number?: string | null
  kode_status_progress?: string | null
  public_bapp_url?: string | null
  npsn_info?: { npsn?: string; nama_sekolah?: string; propinsi?: string; kabupaten_kota?: string; kecamatan?: string; qty?: number } | null
  data_pengiriman?: Array<{ nomor_resi?: string; ekspedisi?: string; status_pengiriman?: string; waktu_tiba?: string | null }>
  foto_instalasi?: Record<string, string | null>
  [key: string]: unknown
}

type TokenState = { token: string; expiresAt: number }
const tokenCache = new Map<string, TokenState>()
let exportTokenCache: TokenState | null = null
type ResponseCacheState = { response: HisenseListResponse; expiresAt: number }
const responseCache = new Map<string, ResponseCacheState>()
const configuredCacheTtl = Number(process.env.HISENSE_CACHE_TTL_MS ?? 30_000)
const responseCacheTtl = Number.isFinite(configuredCacheTtl) ? Math.max(0, configuredCacheTtl) : 30_000

function credentialsFor(code: string) {
  const prefix = code.toUpperCase()
  const username = process.env[`HISENSE_${prefix}_USERNAME`]
  const password = process.env[`HISENSE_${prefix}_PASSWORD`]
  if (!username || !password) return null
  return { username, password }
}

async function tokenFor(code: string) {
  const cached = tokenCache.get(code)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token
  const credentials = credentialsFor(code)
  if (!credentials) throw new Error(`Hisense credentials are not configured for ${code.toUpperCase()}`)
  const response = await fetch(`${baseUrl}/direktorat/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials), signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Hisense authentication failed for ${code.toUpperCase()} (${response.status})`)
  const payload = await response.json() as { data?: { token?: string; expires_in?: string } }
  if (!payload.data?.token) throw new Error(`Hisense authentication returned no token for ${code.toUpperCase()}`)
  const expiresInDays = Number.parseInt(payload.data.expires_in ?? '1', 10) || 1
  tokenCache.set(code, { token: payload.data.token, expiresAt: Date.now() + expiresInDays * 24 * 60 * 60 * 1000 })
  return payload.data.token
}

async function adminToken() {
    if (exportTokenCache && exportTokenCache.expiresAt > Date.now() + 60_000) return exportTokenCache.token
    const credentials = credentialsFor('smk')
    if (!credentials) throw new Error('Kredensial Hisense SMK belum diatur di server.')
    const response = await fetch(`${baseUrl}/hi-auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials), signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`Login ekspor Hisense gagal (${response.status}).`)
    const payload = await response.json() as { token?: string }
    if (!payload.token) throw new Error('Login ekspor Hisense tidak mengembalikan token.')
    exportTokenCache = { token: payload.token, expiresAt: Date.now() + 60 * 60 * 1000 }
    return payload.token
}

export async function reviewHisenseAllocation(id: string, body: { kode_status_progress: 'DISETUJUI' | 'REVISI'; reviewer_name: string; catatan_revisi?: string; tag_revisi?: string }) {
  let token = await adminToken()
  const request = () => fetch(`${baseUrl}/hi-transaksi/alokasi/review/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-active-batch': '3' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(90_000)
  })
  let response = await request()
  if (response.status === 401) {
    await response.body?.cancel()
    exportTokenCache = null
    token = await adminToken()
    response = await request()
  }
  const result = await response.json().catch(() => null) as { success?: boolean; message?: string } | null
  if (!response.ok || result?.success === false) throw new Error(result?.message || `Reviu Hisense gagal (${response.status}).`)
}

export async function downloadHisenseSmkAllocationExcel(onProgress: (received: number, total: number | null) => void = () => {}) {
  const url = new URL(`${baseUrl}/hi-transaksi/alokasi/export`)
  for (const [key, value] of Object.entries({ format: 'excel', search: 'true', exclude_pengajuan_penarikan: 'true', kode_direktorat: 'SMK', show_sn_filled: 'true', show_sn_empty: 'true', sort_by: 'id_transaksi', order: 'asc' })) url.searchParams.set(key, value)
  let token = await adminToken()
  const request = () => fetch(url, { headers: { Authorization: `Bearer ${token}`, 'x-active-batch': '3', Accept: 'application/json, text/plain, */*' }, signal: AbortSignal.timeout(300_000) })
  let response = await request()
  if (response.status === 401) {
    await response.body?.cancel()
    exportTokenCache = null
    token = await adminToken()
    response = await request()
  }
  if (!response.ok) throw new Error(`Unduh Excel Hisense gagal (${response.status}).`)
  if (!response.body) throw new Error('Excel Hisense tidak memiliki isi.')
  const total = Number(response.headers.get('content-length')) || null
  const chunks: Uint8Array[] = []
  let received = 0
  for await (const chunk of response.body) {
    received += chunk.length
    if (received > 100 * 1024 * 1024) throw new Error('Excel Hisense melebihi batas 100 MB.')
    chunks.push(chunk)
    onProgress(received, total)
  }
  const buffer = Buffer.concat(chunks)
  if (buffer.subarray(0, 2).toString() !== 'PK') throw new Error('Respons Hisense bukan file Excel .xlsx.')
  return buffer
}

async function fetchDirectorate(code: string, query: Record<string, string | undefined>, bypassCache = false, cacheResponse = true) {
  let token = await tokenFor(code)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  const cacheKey = `${code}:${params.toString()}`
  const cached = responseCache.get(cacheKey)
  if (!bypassCache && cached && cached.expiresAt > Date.now()) return cached.response
  const request = () => fetch(`${baseUrl}/direktorat/${code}?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) })
  let response = await request()
  if (response.status === 401) {
    await response.body?.cancel()
    tokenCache.delete(code)
    token = await tokenFor(code)
    response = await request()
  }
  if (!response.ok) throw new Error(`Hisense GET ${code.toUpperCase()} failed (${response.status})`)
  const result = await response.json() as HisenseListResponse
  if (result.success !== true || !Array.isArray(result.data)) throw new Error(`Hisense ${code.toUpperCase()} mengembalikan data yang tidak valid`)
  if (cacheResponse) responseCache.set(cacheKey, { response: result, expiresAt: Date.now() + responseCacheTtl })
  return result
}

export async function getHisenseTransactions(query: Record<string, string | undefined>, selectedDirectorate?: string, options: { bypassCache?: boolean } = {}) {
  const codes = selectedDirectorate ? [selectedDirectorate.toLowerCase()] : directorates
  const responses = await Promise.all(codes.map(async (code) => ({ code, response: await fetchDirectorate(code, query, options.bypassCache) })))
  const data = responses.flatMap(({ code, response }) => (response.data ?? []).map((item) => ({ ...item, kode_direktorat: item.kode_direktorat ?? code.toUpperCase() })))
  return { data, sources: responses.map(({ code }) => code.toUpperCase()), meta: responses[0]?.response.meta }
}

export async function getHisenseTransaction(id: string, selectedDirectorate?: string, options: { bypassCache?: boolean } = {}) {
  const started = Date.now()
  for (let page = 1; page <= 100; page++) {
    if (Date.now() - started > 90_000) throw new Error('Pencarian Hisense terlalu lama. Silakan cek ulang.')
    const result = await getHisenseTransactions({ search: id, limit: '100', page: String(page) }, selectedDirectorate, options)
    const match = result.data.find(item => item.id_transaksi === id)
    if (match) return match
    if (result.meta?.has_next_page === false) return null
    if (result.meta?.has_next_page !== true || result.meta.current_page !== page || !result.data.length) {
      throw new Error('Hasil pencarian Hisense belum lengkap. Silakan cek ulang.')
    }
  }
  throw new Error('Batas pencarian Hisense tercapai. Silakan cek ulang.')
}

export function configuredDirectorates() { return directorates.map((code) => code.toUpperCase()) }

// A search result may match an ID, school name, or a partial serial number.
// BAPP verification accepts only an exact serial match and checks every page
// so ambiguous serial numbers cannot be assigned to the wrong school.
export async function getHisenseBySerialNumber(serialNumber: string, selectedDirectorate = 'smk', options: { bypassCache?: boolean } = {}) {
  const serial = serialNumber.trim()
  if (!serial) return null
  const started = Date.now()
  let match: HisenseTransaction | null = null
  for (let page = 1; page <= 100; page++) {
    if (Date.now() - started > 90_000) throw new Error('Pencarian serial number terlalu lama. Silakan cek ulang.')
    const result = await getHisenseTransactions({ search: serial, limit: '100', page: String(page) }, selectedDirectorate, options)
    for (const item of result.data) {
      if (item.serial_number?.trim() !== serial) continue
      if (item.kode_direktorat?.toLowerCase() !== selectedDirectorate.toLowerCase() || !item.npsn_info?.npsn?.trim()) {
        throw new Error('Data sekolah serial number belum dapat dikonfirmasi.')
      }
      if (match && (match.id_transaksi !== item.id_transaksi || match.npsn_info?.npsn?.trim() !== item.npsn_info.npsn.trim())) {
        throw new Error('Serial number ditemukan pada lebih dari satu unit atau sekolah.')
      }
      match = item
    }
    if (result.meta?.has_next_page === false) return match
    if (result.meta?.has_next_page !== true || result.meta.current_page !== page || !result.data.length) {
      throw new Error('Hasil pencarian serial number belum lengkap. Silakan cek ulang.')
    }
  }
  throw new Error('Batas pencarian serial number tercapai. Silakan cek ulang.')
}

// Statistics must traverse every page, independently of the paginated transaction UI.
// Do not cache the full records (photos, contacts, etc.) for this aggregation.
export async function* getHisenseSmkPages(filters: Record<string, string | undefined> = {}) {
  let expectedTotal: number | undefined
  let expectedPages: number | undefined
  let received = 0
  const started = Date.now()
  for (let page = 1; page <= 1000; page++) {
    if (Date.now() - started > 180_000) throw new Error('Pengambilan seluruh data SMK terlalu lama. Silakan coba lagi.')
    const result = await fetchDirectorate('smk', { status: filters.status, search: filters.search, nama_batch: filters.nama_batch, nama_termin: filters.nama_termin, page: String(page), limit: '1000' }, true, false)
    const meta = result.meta
    if (!meta || !Number.isInteger(meta.item_count) || meta.item_count! < 0 ||
        !Number.isInteger(meta.page_count) || meta.page_count! < 0 || meta.current_page !== page ||
        typeof meta.has_next_page !== 'boolean') {
      throw new Error('Metadata pagination Hisense tidak lengkap. Statistik belum dapat dihitung.')
    }
    if (expectedTotal === undefined) { expectedTotal = meta.item_count!; expectedPages = meta.page_count! }
    if (meta.item_count !== expectedTotal || meta.page_count !== expectedPages) {
      throw new Error('Jumlah data Hisense berubah saat sinkronisasi. Silakan muat ulang statistik.')
    }
    const rows = result.data!
    if (!rows.length && expectedTotal > 0) throw new Error('Halaman data SMK kosong sebelum seluruh data selesai diambil.')
    received += rows.length
    if (received > expectedTotal) throw new Error('Jumlah data SMK tidak sesuai metadata Hisense.')
    yield rows
    if (!meta.has_next_page) {
      if (received !== expectedTotal || (expectedTotal > 0 && page !== expectedPages)) {
        throw new Error('Data SMK belum lengkap. Statistik parsial tidak ditampilkan.')
      }
      return
    }
    if (page >= expectedPages! || received >= expectedTotal) throw new Error('Pagination Hisense tidak konsisten. Silakan coba lagi.')
  }
  throw new Error('Batas pengambilan halaman Hisense tercapai. Statistik belum lengkap.')
}
