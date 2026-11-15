<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import HisenseProvinceProgress from '~/components/HisenseProvinceProgress.vue'
import ProvinceDistribution from '~/components/ProvinceDistribution.vue'

type Overview = { services?: number; operational?: number; uptime?: number; latency?: number; penerimaPid2026: number; province?: string }

const config = useRuntimeConfig()
const authUser = useState<{ id: number; username: string; role: 'Admin' | 'Dinas' | 'Internal'; province: string | null } | null>('auth-user')
useHead({ title: 'Dashboard | Dashboard Pemantauan Digitalisasi Pembelajaran SMK' })
const wibHourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  hourCycle: 'h23'
})
const getWibHour = () => Number(wibHourFormatter.format(new Date()))
const wibHour = useState<number>('dashboard-wib-hour', getWibHour)
const greeting = computed(() => {
  if (wibHour.value >= 5 && wibHour.value < 11) return 'Selamat pagi'
  if (wibHour.value >= 11 && wibHour.value < 15) return 'Selamat siang'
  if (wibHour.value >= 15 && wibHour.value < 18) return 'Selamat sore'
  return 'Selamat malam'
})
let greetingInterval: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  wibHour.value = getWibHour()
  greetingInterval = setInterval(() => {
    wibHour.value = getWibHour()
  }, 60_000)
})

onUnmounted(() => {
  if (greetingInterval !== undefined) clearInterval(greetingInterval)
})

const { data: overview, pending: overviewPending } = await useFetch<Overview>('/api/overview', { key: `overview:${authUser.value?.id}:${authUser.value?.province}`, baseURL: config.public.apiBase, credentials: 'include', headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined, immediate: authUser.value?.role !== 'Internal' })

type BappSummary = { perluDireviu: number; totalDisetujui: number; totalSesuaiApip: number; totalReviuApip: number; totalDitolakRevisi: number }
type ReviewerStats = { username: string; petugas: string; alokasi: number; diterima: number; ditolak: number; sedangRevisi: number; sudahDiperiksa: number; belumDiperiksa: number }
const showBapp = authUser.value?.role === 'Admin' || authUser.value?.role === 'Internal'
const { data: bappData, pending: bappPending, error: bappError, refresh: refreshBapp } = await useFetch<{ summary: BappSummary; reviewers: ReviewerStats[] }>('/api/bapp-dashboard', {
  key: `bapp-dashboard:${authUser.value?.id}`,
  baseURL: config.public.apiBase,
  credentials: 'include',
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
  immediate: showBapp
})
const bappSyncedAt = ref<number | null>(null)
const bappTimeFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const bappSyncLabel = computed(() => bappSyncedAt.value ? `${bappTimeFormatter.format(new Date(bappSyncedAt.value))} WIB` : 'belum tersedia')
let bappRefreshInterval: ReturnType<typeof setInterval> | undefined
watch(bappData, value => { if (import.meta.client && value && !bappError.value) bappSyncedAt.value = Date.now() })
onMounted(() => {
  if (!showBapp) return
  if (bappData.value && !bappError.value) bappSyncedAt.value = Date.now()
  bappRefreshInterval = setInterval(async () => {
    if (bappPending.value) return
    await refreshBapp()
    if (!bappError.value) bappSyncedAt.value = Date.now()
  }, 60_000)
})
onUnmounted(() => { if (bappRefreshInterval !== undefined) clearInterval(bappRefreshInterval) })
const number = (value: number) => new Intl.NumberFormat('id-ID').format(value)
const downloadingRekap = ref(false)
const downloadError = ref('')

function wrapCanvasText(context: CanvasRenderingContext2D, value: string, width: number) {
  const lines: string[] = []
  let line = ''
  for (const word of value.split(/\s+/)) {
    if (!word) continue
    const next = line ? `${line} ${word}` : word
    if (context.measureText(next).width <= width) { line = next; continue }
    if (line) lines.push(line)
    line = ''
    for (const character of word) {
      if (line && context.measureText(line + character).width > width) { lines.push(line); line = '' }
      line += character
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

async function downloadRekap() {
  if (downloadingRekap.value) return
  downloadingRekap.value = true
  downloadError.value = ''
  try {
    await refreshBapp()
    if (bappError.value || !bappData.value?.reviewers.length) throw new Error('Data petugas belum tersedia.')
    const reviewers = bappData.value.reviewers
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Browser tidak dapat membuat gambar.')
    const columns: Array<{ label: string; key: keyof Pick<ReviewerStats, 'alokasi' | 'diterima' | 'ditolak' | 'sedangRevisi' | 'sudahDiperiksa' | 'belumDiperiksa'>; x: number }> = [
      { label: 'Alokasi', key: 'alokasi', x: 690 }, { label: 'Diterima', key: 'diterima', x: 830 },
      { label: 'Ditolak', key: 'ditolak', x: 970 }, { label: 'Sedang Revisi', key: 'sedangRevisi', x: 1135 },
      { label: 'Sudah Diperiksa', key: 'sudahDiperiksa', x: 1335 }, { label: 'Belum Diperiksa', key: 'belumDiperiksa', x: 1552 }
    ]
    const rows = reviewers.map(reviewer => {
      context.font = '600 19px Arial, sans-serif'
      const nameLines = wrapCanvasText(context, reviewer.petugas, 370)
      context.font = '14px Arial, sans-serif'
      const usernameLines = wrapCanvasText(context, reviewer.username, 370)
      return { reviewer, nameLines, usernameLines, height: Math.max(66, nameLines.length * 24 + usernameLines.length * 19 + 16) }
    })
    canvas.height = 198 + rows.reduce((sum, row) => sum + row.height, 0) + 56
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.textBaseline = 'middle'
    context.textAlign = 'left'
    context.fillStyle = '#0f172a'
    context.font = 'bold 34px Arial, sans-serif'
    context.fillText('Rekap Petugas Reviewer', 48, 62)
    const exportedAt = new Date()
    context.fillStyle = '#64748b'
    context.font = '18px Arial, sans-serif'
    context.fillText(`${reviewers.length} petugas · ${bappTimeFormatter.format(exportedAt)} WIB`, 48, 105)
    context.fillStyle = '#e0f2fe'
    context.fillRect(32, 143, 1536, 55)
    context.fillStyle = '#075985'
    context.font = 'bold 17px Arial, sans-serif'
    context.fillText('Peringkat', 48, 170)
    context.fillText('Petugas', 150, 170)
    context.textAlign = 'right'
    for (const column of columns) context.fillText(column.label, column.x, 170)
    let top = 198
    rows.forEach(({ reviewer, nameLines, usernameLines, height }, index) => {
      context.fillStyle = index % 2 ? '#f8fafc' : '#ffffff'
      context.fillRect(32, top, 1536, height)
      context.textBaseline = 'middle'
      context.fillStyle = '#334155'
      context.font = 'bold 19px Arial, sans-serif'
      context.textAlign = 'left'
      context.fillText(String(index + 1), 48, top + height / 2)
      context.textBaseline = 'top'
      context.fillStyle = '#0f172a'
      context.font = '600 19px Arial, sans-serif'
      nameLines.forEach((line, lineIndex) => context.fillText(line, 150, top + 8 + lineIndex * 24))
      context.fillStyle = '#64748b'
      context.font = '14px Arial, sans-serif'
      usernameLines.forEach((line, lineIndex) => context.fillText(line, 150, top + 8 + nameLines.length * 24 + lineIndex * 19))
      context.textBaseline = 'middle'
      context.textAlign = 'right'
      context.fillStyle = '#334155'
      context.font = '18px Arial, sans-serif'
      for (const column of columns) context.fillText(number(reviewer[column.key]), column.x, top + height / 2)
      top += height
    })
    context.fillStyle = '#cbd5e1'
    context.fillRect(32, top, 1536, 1)
    context.fillStyle = '#64748b'
    context.font = '15px Arial, sans-serif'
    context.textAlign = 'left'
    context.fillText('Dashboard Pemantauan Digitalisasi Pembelajaran SMK', 48, top + 29)
    const image = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Gambar terlalu besar untuk browser ini.')), 'image/png'))
    const url = URL.createObjectURL(image)
    const link = document.createElement('a')
    link.href = url
    link.download = `rekap-petugas-reviewer-${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(exportedAt)}.png`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    downloadError.value = error instanceof Error ? error.message : 'Gambar rekap gagal dibuat.'
  } finally {
    downloadingRekap.value = false
  }
}

const stats = computed(() => [
  { label: 'Penerima PID 2026', value: overview.value?.penerimaPid2026 ?? 0, change: 'Jumlah', detail: 'sekolah penerima', tone: 'sky' }
])
</script>

<template>
  <AppShell>
      <header class="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div class="flex h-20 items-center justify-between px-5 sm:px-8">
          <div class="flex items-center gap-3 pl-12 lg:pl-0">
            <div>
              <h1 class="text-xl font-semibold tracking-tight">Dashboard</h1>
            </div>
          </div>
          <div class="flex items-center gap-2"><button
              class="grid h-9 w-9 place-items-center rounded-full bg-sky-500 text-lg text-white shadow-sm hover:bg-sky-600"
              aria-label="Quick add">
              <AppIcon name="plus" />
            </button></div>
        </div>
      </header>

      <main id="overview" class="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">
        <div class="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 class="text-2xl font-semibold tracking-tight">{{ greeting }}, {{ authUser?.username }} <span
                aria-hidden="true">
                <AppIcon name="hand" />
              </span></h2>
          </div>
        </div>
        <section v-if="authUser?.role !== 'Internal'" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article v-for="stat in stats" :key="stat.label"
            class="rounded-theme border border-stone-200 bg-white p-5 shadow-card">
            <div class="flex items-start justify-between">
              <p class="text-sm text-muted">{{ stat.label }}</p><span class="grid h-8 w-8 place-items-center rounded-lg"
                :class="stat.tone === 'sky' ? 'bg-sky-100 text-sky-600' : stat.tone === 'teal' ? 'bg-teal-100 text-teal-600' : stat.tone === 'violet' ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'">
                <AppIcon name="school" />
              </span>
            </div>
            <p class="mt-4 text-3xl font-semibold tracking-tight">{{ overviewPending ? '—' : stat.value }}</p>
            <p class="mt-2 text-xs"><span class="font-semibold text-teal-600">{{ stat.change }}</span> <span
                class="text-muted">{{ stat.detail }}</span></p>
          </article>
        </section>
        <section v-if="showBapp" class="mt-8 space-y-5">
          <h2 class="text-xl font-semibold">Ringkasan Cek BAPP</h2>
          <p v-if="bappError" role="alert" class="text-sm text-red-700">Ringkasan BAPP belum dapat dimuat.</p>
          <BappSummaryCards :summary="bappData?.summary ?? null" :loading="bappPending && !bappData" />
          <div class="overflow-x-auto rounded-theme border border-stone-200 bg-white shadow-card">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4"><div><h3 class="text-lg font-semibold">Petugas Reviewer</h3><p class="mt-1 text-xs text-muted">Peringkat berdasarkan jumlah transaksi yang sudah diperiksa. Diperbarui otomatis setiap 1 menit.</p></div><div class="flex flex-wrap items-center gap-3"><p role="status" class="inline-flex items-center gap-2 text-xs text-muted"><AppIcon name="refresh" class="h-4 w-4" :class="{ 'animate-spin': bappPending }" />Data terakhir sinkron: {{ bappSyncLabel }}</p><button type="button" :disabled="downloadingRekap || bappPending || !bappData?.reviewers?.length" class="inline-flex items-center gap-2 rounded-theme bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50" @click="downloadRekap"><AppIcon name="download" class="h-4 w-4" />{{ downloadingRekap ? 'Membuat gambar…' : 'Download Rekap' }}</button></div></div>
            <p v-if="downloadError" role="alert" class="px-5 py-2 text-sm text-red-700">{{ downloadError }}</p>
            <table class="w-full min-w-[900px] text-left text-sm">
              <thead class="bg-stone-50 text-muted"><tr><th scope="col" class="px-5 py-3">Peringkat</th><th scope="col" class="px-5 py-3">Petugas</th><th scope="col" class="px-5 py-3 text-right">Alokasi</th><th scope="col" class="px-5 py-3 text-right">Diterima</th><th scope="col" class="px-5 py-3 text-right">Ditolak</th><th scope="col" class="px-5 py-3 text-right">Sedang Revisi</th><th scope="col" class="px-5 py-3 text-right">Sudah Diperiksa</th><th scope="col" class="px-5 py-3 text-right">Belum Diperiksa</th></tr></thead>
              <tbody>
                <tr v-for="(reviewer, index) in bappData?.reviewers ?? []" :key="reviewer.username" :class="index === 0 ? 'bg-amber-50/80' : index === 1 ? 'bg-slate-50' : index === 2 ? 'bg-orange-50/80' : 'hover:bg-stone-50'" class="border-t border-stone-100 transition-colors">
                  <td class="px-5 py-3"><span v-if="index < 3" :class="index === 0 ? 'bg-amber-100 text-amber-800 ring-amber-200' : index === 1 ? 'bg-slate-200 text-slate-700 ring-slate-300' : 'bg-orange-100 text-orange-800 ring-orange-200'" class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1"><AppIcon name="medal" class="h-4 w-4" />{{ index + 1 }}</span><span v-else class="pl-2 text-sm font-semibold text-muted">{{ index + 1 }}</span></td>
                  <td class="px-5 py-3 font-medium">{{ reviewer.petugas }} <span class="block text-xs font-normal text-muted">{{ reviewer.username }}</span></td>
                  <td class="px-5 py-3 text-right font-semibold">{{ number(reviewer.alokasi) }}</td><td class="px-5 py-3 text-right">{{ number(reviewer.diterima) }}</td><td class="px-5 py-3 text-right">{{ number(reviewer.ditolak) }}</td><td class="px-5 py-3 text-right">{{ number(reviewer.sedangRevisi) }}</td><td class="px-5 py-3 text-right">{{ number(reviewer.sudahDiperiksa) }}</td><td class="px-5 py-3 text-right">{{ number(reviewer.belumDiperiksa) }}</td>
                </tr>
                <tr v-if="!bappData?.reviewers?.length"><td colspan="8" class="px-5 py-8 text-center text-muted">{{ bappPending ? 'Memuat data petugas…' : 'Belum ada petugas reviewer.' }}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <HisenseProvinceProgress v-if="authUser?.role !== 'Internal'" />
        <ProvinceDistribution v-if="authUser?.role === 'Admin'" />
      </main>
    </AppShell>
</template>
