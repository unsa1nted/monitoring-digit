import './config.js'
import { cors } from '@elysiajs/cors'
import { cookie } from '@elysiajs/cookie'
import { node } from '@elysiajs/node'
import { Elysia } from 'elysia'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { db, pool } from './db/index.js'
import { activityLogs, schools, services } from './db/schema.js'
import { clearSessionCookie, createSession, findUser, getSessionUser, setSessionCookie, verifyPassword } from './auth.js'
import { configuredDirectorates, getHisenseTransaction, getHisenseTransactions, getHisenseSmkPages, type HisenseTransaction } from './hisense.js'
import { recordActivity } from './activity.js'
import { aggregateProvinceStatistics, provinceKey } from './province-statistics.js'
import { getHisenseProvinceProgress } from './hisense-progress.js'
import { canonicalProvince, schoolScope } from './province-scope.js'
import { adminUsers } from './admin-users.js'
import { bappStorageRoutes } from './bapp-storage.js'
import { startBappValidationWorker } from './bapp-validation.js'
import { bappReportRoutes } from './bapp-report.js'

const normalizeProvince = (value: string | null | undefined) => value ? provinceKey(value) : ''

const app = new Elysia({ adapter: node() })
  .use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true }))
  .use(cookie())
  .onBeforeHandle(async (context) => {
    const path = new URL(context.request.url).pathname.replace(/\/+$/, '')
    if (path === '/api/bapp-report' || path === '/api/bapp-report/export') return
    if (!path.startsWith('/api/') || ['/api/auth/login', '/api/auth/me', '/api/auth/logout', '/api/bapp-fisik/storages'].includes(path) || /^\/api\/bapp-fisik\/storages\/\d+\/scans(?:\/\d+\/(?:recheck|school-recheck))?$/.test(path)) return
    const user = await getSessionUser(context)
    if (user?.role === 'Internal') {
      context.set.status = 403
      return { message: 'Akun Internal hanya memiliki akses ke Bapp Fisik.' }
    }
  })
  .use(adminUsers)
  .use(bappStorageRoutes)
  .use(bappReportRoutes)
  .get('/health', () => ({ status: 'ok', service: 'monitoring-digit-api' }))
  .post('/api/auth/login', async (context) => {
    const { body, set } = context
    const credentials = body as { username?: string; password?: string }
    if (!credentials.username || !credentials.password) { set.status = 400; return { message: 'Username and password are required' } }
    const user = await findUser(credentials.username.trim())
    if (!user || !(await verifyPassword(credentials.password, user.passwordHash))) { set.status = 401; return { message: 'Invalid username or password' } }
    const province = canonicalProvince(user.province)
    if (user.role === 'Dinas' && !province) { set.status = 403; return { message: 'Akun Dinas belum memiliki provinsi yang valid. Hubungi administrator.' } }
    const authUser = { id: user.id, username: user.username, role: user.role, province: user.role === 'Dinas' ? province : null }
    setSessionCookie(context, await createSession(authUser, user.passwordHash))
    await recordActivity(context, authUser, 'LOGIN_SUCCESS')
    return { user: authUser }
  })
  .post('/api/auth/logout', async (context) => { const user = await getSessionUser(context); clearSessionCookie(context); if (user) await recordActivity(context, user, 'LOGOUT').catch(console.error); return { success: true } })
  .get('/api/auth/me', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    return { user }
  })
  .get('/api/services', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    if (user.role !== 'Admin') { context.set.status = 403; return { message: 'Admin access required' } }
    return db.select().from(services).orderBy(desc(services.lastCheckedAt))
  })
  .get('/api/overview', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    const schoolRows = await db.select({ npsn: schools.npsn }).from(schools).where(await schoolScope(user))
    const penerimaPid2026 = new Set(schoolRows.map((school) => school.npsn.trim()).filter(Boolean)).size
    if (user.role === 'Dinas') return { penerimaPid2026, province: user.province }
    const rows = await db.select().from(services)
    const operational = rows.filter((service) => service.status === 'operational').length
    const uptime = rows.length ? rows.reduce((sum, service) => sum + service.uptime, 0) / rows.length / 100 : 100
    const latency = rows.length ? Math.round(rows.reduce((sum, service) => sum + service.latency, 0) / rows.length) : 0
    return { services: rows.length, operational, uptime: Number(uptime.toFixed(2)), latency, penerimaPid2026 }
  })
  .get('/api/admin/province-statistics', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    if (user.role !== 'Admin') { context.set.status = 403; return { message: 'Admin access required' } }
    const rows = await db.select({
      provinsi: schools.provinsi,
      schoolCount: sql<number>`count(distinct nullif(trim(${schools.npsn}), ''))`.mapWith(Number),
      pidCount: sql<number>`coalesce(sum(${schools.jumlahPid}), 0)`.mapWith(Number)
    }).from(schools).groupBy(schools.provinsi)
    return aggregateProvinceStatistics(rows)
  })
  .get('/api/admin/hisense/province-progress', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    if (user.role !== 'Admin') { context.set.status = 403; return { message: 'Admin access required' } }
    context.set.headers['Cache-Control'] = 'no-store'
    try {
      return await getHisenseProvinceProgress()
    } catch (error) {
      context.set.status = 502
      return { message: error instanceof Error ? error.message : 'Statistik Hisense SMK belum dapat dimuat.' }
    }
  })
  .get('/api/hisense/province-progress', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    context.set.headers['Cache-Control'] = 'no-store'
    try {
      const result = await getHisenseProvinceProgress()
      if (user.role === 'Admin') return result
      const province = result.provinces.find(row => row.key === normalizeProvince(user.province))
      if (!province) { context.set.status = 403; return { message: 'Provinsi akun tidak valid.' } }
      const { key, name, mapped, schoolDetails, ...summary } = province
      return { source: result.source, fetchedAt: result.fetchedAt, cacheSeconds: result.cacheSeconds, summary, provinces: [province] }
    } catch (error) {
      context.set.status = 502
      return { message: error instanceof Error ? error.message : 'Statistik provinsi belum dapat dimuat.' }
    }
  })
  .get('/api/admin/activity-logs', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    if (user.role !== 'Admin') { context.set.status = 403; return { message: 'Admin access required' } }
    const query = context.query as Record<string, string | undefined>
    const page = Math.max(1, Number(query.page ?? 1))
    const limit = Math.min(100, Math.max(10, Number(query.limit ?? 50)))
    const rows = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit).offset((page - 1) * limit)
    return { success: true, data: rows, meta: { page, limit } }
  })
  .get('/api/schools/provinces', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    if (user.role === 'Dinas') return { data: [user.province] }
    const rows = await db.selectDistinct({ province: schools.provinsi }).from(schools).orderBy(asc(schools.provinsi))
    return { data: rows.map((row) => row.province) }
  })
  .get('/api/schools/locations', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    const query = context.query as Record<string, string | undefined>
    if (user.role === 'Dinas' && query.provinsi && normalizeProvince(query.provinsi) !== normalizeProvince(user.province)) {
      context.set.status = 403; return { message: 'Akses dibatasi untuk provinsi akun Anda.' }
    }
    const province = user.role === 'Dinas' ? user.province : query.provinsi
    const conditions = []
    const scope = await schoolScope(user)
    if (scope) conditions.push(scope)
    if (province && user.role === 'Admin') conditions.push(eq(schools.provinsi, province))
    if (query.kab_kota) conditions.push(eq(schools.kabKota, query.kab_kota))
    const rows = await db.selectDistinct({ kabKota: schools.kabKota, kecamatan: schools.kecamatan }).from(schools).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(schools.kabKota), asc(schools.kecamatan))
    return { kabKotas: [...new Set(rows.map((row) => row.kabKota))], kecamatans: [...new Set(rows.map((row) => row.kecamatan))] }
  })
  .get('/api/hisense/transactions/:id', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    if (user.role === 'Dinas' && !user.province) { context.set.status = 403; return { message: 'Akun Dinas belum memiliki provinsi' } }
    try {
      const id = decodeURIComponent(context.params.id)
      const query = context.query as Record<string, string | undefined>
      if (query.direktorat && query.direktorat.toLowerCase() !== 'smk') { context.set.status = 400; return { message: 'Direktorat tidak dikonfigurasi' } }
      const item = await getHisenseTransaction(id, 'smk', { bypassCache: query.refresh === '1' })
      if (!item) { context.set.status = 404; return { success: false, message: 'Detail transaksi tidak ditemukan' } }
      if (user.role === 'Dinas' && normalizeProvince(item.npsn_info?.propinsi) !== normalizeProvince(user.province)) {
        context.set.status = 404
        return { success: false, message: 'Detail transaksi tidak ditemukan' }
      }
      const relatedResult = item.npsn_info?.npsn
        ? await getHisenseTransactions({ search: item.npsn_info.npsn, limit: '100' }, 'smk', { bypassCache: query.refresh === '1' })
        : { data: [] }
      const relatedData = relatedResult.data.filter((related) => related.npsn_info?.npsn === item.npsn_info?.npsn && (user.role === 'Admin' || normalizeProvince(related.npsn_info?.propinsi) === normalizeProvince(user.province)))
      return { success: true, data: item, related_data: relatedData.length ? relatedData : [item] }
    } catch (error) {
      context.set.status = 502
      return { success: false, message: error instanceof Error ? error.message : 'Hisense API unavailable' }
    }
  })
  .get('/api/hisense/transactions', async (context) => {
    const user = await getSessionUser(context)
    if (!user) { context.set.status = 401; return { message: 'Unauthenticated' } }
    if (user.role === 'Dinas' && !user.province) { context.set.status = 403; return { message: 'Akun Dinas belum memiliki provinsi' } }
    try {
      const query = context.query as Record<string, string | undefined>
      const selectedDirectorate = query.direktorat?.toLowerCase()
      const hasLocationFilter = user.role === 'Dinas' || Boolean(query.provinsi || query.kab_kota || query.kecamatan)
      if (user.role === 'Dinas' && query.provinsi && normalizeProvince(query.provinsi) !== normalizeProvince(user.province)) {
        context.set.status = 403; return { message: 'Akses dibatasi untuk provinsi akun Anda.' }
      }
      const currentPage = Number(query.page ?? 1)
      const pageSize = 10
      if (!Number.isSafeInteger(currentPage) || currentPage < 1) { context.set.status = 400; return { message: 'Nomor halaman tidak valid.' } }
      if (selectedDirectorate && !configuredDirectorates().map((code) => code.toLowerCase()).includes(selectedDirectorate)) {
        context.set.status = 400
        return { message: 'Direktorat tidak dikonfigurasi' }
      }
      const upstreamQuery = {
        page: String(currentPage),
        limit: String(pageSize),
        status: query.status,
        nama_batch: query.nama_batch,
        nama_termin: query.nama_termin,
        search: query.search
      }
      const matchesScope = (item: HisenseTransaction) => {
        const province = normalizeProvince(item.npsn_info?.propinsi) ?? ''
        const kabKota = item.npsn_info?.kabupaten_kota?.toLowerCase() ?? ''
        const kecamatan = item.npsn_info?.kecamatan?.toLowerCase() ?? ''
        return (user.role === 'Admin' || province === normalizeProvince(user.province)) &&
          (!query.provinsi || province === normalizeProvince(query.provinsi)) &&
          (!query.kab_kota || kabKota === query.kab_kota.toLowerCase()) &&
          (!query.kecamatan || kecamatan === query.kecamatan.toLowerCase())
      }
      const result = hasLocationFilter ? null : await getHisenseTransactions(upstreamQuery, 'smk')
      const locationData: HisenseTransaction[] = result?.data ?? []
      if (hasLocationFilter) {
        for await (const page of getHisenseSmkPages(upstreamQuery)) locationData.push(...page.filter(matchesScope))
      }
      const data = hasLocationFilter ? locationData.slice((currentPage - 1) * pageSize, currentPage * pageSize) : locationData
      const pageCount = hasLocationFilter ? Math.max(1, Math.ceil(locationData.length / pageSize)) : (result?.meta?.page_count ?? 1)
      const npsns = [...new Set(data.map((item) => item.npsn_info?.npsn).filter((npsn): npsn is string => Boolean(npsn)))]
      const schoolRows = npsns.length ? await db.select({ npsn: schools.npsn, jumlahPid: schools.jumlahPid }).from(schools).where(and(inArray(schools.npsn, npsns), await schoolScope(user))) : []
      const pidByNpsn = new Map(schoolRows.map((school) => [school.npsn, school.jumlahPid]))
      const enrichedData = data.map((item) => ({ ...item, jumlah_pid: item.npsn_info?.npsn ? (pidByNpsn.get(item.npsn_info.npsn) ?? 0) : 0 }))
      return { success: true, data: enrichedData, meta: { count: hasLocationFilter ? locationData.length : (result?.meta?.item_count ?? locationData.length), sources: ['SMK'], scope: user.role === 'Admin' ? 'all' : user.province, page_count: pageCount, current_page: currentPage, has_next_page: hasLocationFilter ? currentPage < pageCount : (result?.meta?.has_next_page ?? false), limit: pageSize } }
    } catch (error) {
      context.set.status = 502
      return { success: false, message: error instanceof Error ? error.message : 'Hisense API unavailable' }
    }
  })
  .listen(Number(process.env.API_PORT ?? 4000))

console.log(`API running at http://localhost:${process.env.API_PORT ?? 4000}`)
const bappValidationTimer = startBappValidationWorker()

process.on('SIGINT', async () => {
  clearInterval(bappValidationTimer)
  await pool.end()
  process.exit(0)
})
