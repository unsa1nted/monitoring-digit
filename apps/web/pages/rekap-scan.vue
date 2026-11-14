<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
useHead({ title: 'Rekap Scan BAPP | Monitoring Digit' })
type Completion = 'complete' | 'incomplete' | 'unknown'
type Row = { folderNumber: number | null; id: number; barcode: string; createdAt: string; schoolName: string | null; npsn: string | null; vendor: string; storageId: number; storageName: string; storageType: string; validationStatus: string; scannedBy: string | null; occurrences: number; completion: Completion; schoolProgress: { scanned: number | null; total: number | null } | null }
type Summary = { unscannedSchools: number; totalScans: number; uniqueTransactions: number; totalSchools: number; completeSchools: number; incompleteSchools: number; unknownSchools: number; totalPid: number; completePid: number; incompletePid: number; unknownTransactions: number }
type IncompleteSchool = { npsn: string; schoolName: string | null; vendor: string; scanned: number; total: number; missing: number; storages: string[] }
type Report = { incompleteSchools: { data: IncompleteSchool[]; totalRows: number; page: number; pageSize: number }; data: Row[]; summary: Summary; generatedAt: string; page: number; pageSize: number; totalRows: number; storages: { id: number; name: string; vendor: string; type: string }[] }
const config = useRuntimeConfig()
const authUser = useState<{ role: string } | null>('auth-user')
const draft = reactive({ storage: '', vendor: '', completion: '', search: '' })
const applied = ref<Record<string, string>>({})
const page = ref(1)
const schoolPage = ref(1)
const report = ref<Report | null>(null)
const storages = ref<Report['storages']>([])
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const exportError = ref('')
let requestVersion = 0
let timer: ReturnType<typeof setInterval> | undefined
const inputClass = 'w-full rounded-theme border border-stone-300 bg-white px-3 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100'
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-theme border border-stone-300 px-4 py-3 text-sm font-medium hover:bg-stone-50 disabled:opacity-50'
const completionLabels = { complete: 'Lengkap', incomplete: 'Belum lengkap', unknown: 'Belum diketahui' }
const completionClasses = { complete: 'bg-teal-50 text-teal-800', incomplete: 'bg-amber-50 text-amber-800', unknown: 'bg-stone-100 text-stone-600' }
const validationLabels: Record<string, string> = { valid: 'Valid', invalid: 'Tidak valid', pending: 'Menunggu', checking: 'Mengecek', error: 'Perlu cek ulang', unsupported: 'Belum tersedia' }
const date = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(value))
const metrics = computed(() => report.value ? [
  { label: 'Total PID diketahui', value: report.value.summary.totalPid },
  { label: 'PID · BAPP sudah terscan', value: report.value.summary.completePid },
  { label: 'PID · BAPP belum terscan', value: report.value.summary.incompletePid },
  { label: 'Serial number belum diketahui', value: report.value.summary.unknownTransactions }
] : [])
async function loadReport() {
  const version = ++requestVersion
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<Report>('/api/bapp-report', { baseURL: config.public.apiBase, credentials: 'include', query: { ...applied.value, page: page.value, schoolPage: schoolPage.value }, timeout: 30000, retry: 0 })
    if (version !== requestVersion) return
    report.value = data
    schoolPage.value = data.incompleteSchools.page
    storages.value = data.storages
  } catch { if (version === requestVersion) error.value = 'Rekap gagal dimuat. Silakan muat ulang.' }
  finally { if (version === requestVersion) loading.value = false }
}
function applyFilters() {
  applied.value = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value))
  page.value = 1
  schoolPage.value = 1
  report.value = null
  exportError.value = ''
  void loadReport()
}
function resetFilters() {
  Object.assign(draft, { storage: '', vendor: '', completion: '', search: '' })
  applyFilters()
}
async function exportExcel() {
  if (exporting.value || !report.value || loading.value || error.value) return
  exporting.value = true
  exportError.value = ''
  try {
    const blob = await $fetch<Blob>('/api/bapp-report/export', { baseURL: config.public.apiBase, credentials: 'include', query: applied.value, responseType: 'blob', timeout: 120000, retry: 0 })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'rekap-scan-bapp.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch { exportError.value = 'Ekspor Excel gagal. Silakan coba lagi.' }
  finally { exporting.value = false }
}
onMounted(() => {
  void loadReport()
  timer = setInterval(() => { if (!loading.value && !exporting.value && document.visibilityState === 'visible') void loadReport() }, 15000)
})
onUnmounted(() => { clearInterval(timer); requestVersion++ })
</script>

<template>
  <AppShell>
    <header class="border-b border-stone-200 bg-white px-5 pb-6 sm:px-8" :class="authUser?.role === 'Internal' ? 'pt-6' : 'pt-20 lg:pt-6'">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div><h1 class="text-2xl font-semibold">Rekap Scan BAPP</h1><p class="mt-2 text-sm text-muted">Seluruh serial number terscan, lokasi penyimpanan, dan kelengkapan BAPP sekolah.</p></div>
        <button type="button" :disabled="loading || exporting || !!error || !report" class="inline-flex items-center gap-2 rounded-theme bg-ink px-4 py-3 text-sm font-medium text-white disabled:opacity-50" @click="exportExcel"><AppIcon :name="exporting ? 'loading' : 'save'" :class="{ 'animate-spin': exporting }" />{{ exporting ? 'Menyiapkan Excel…' : 'Export Excel' }}</button>
      </div>
    </header>
    <main class="min-h-[calc(100dvh-110px)] bg-white px-5 py-8 sm:px-8">
      <NuxtLink :to="authUser?.role === 'Internal' ? '/bapp-fisik' : '/'" :class="buttonClass"><AppIcon name="arrow-left" />Kembali</NuxtLink>
      <form class="mt-6 border-y border-stone-200 py-6" @submit.prevent="applyFilters">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div><label for="report-storage" class="mb-2 block text-sm font-medium">Lokasi Penyimpanan</label><select id="report-storage" v-model="draft.storage" :class="inputClass"><option value="">Semua penyimpanan</option><option v-for="storage in storages" :key="storage.id" :value="String(storage.id)">{{ storage.name }} · {{ storage.type }} · {{ storage.vendor }} · BAPP-{{ String(storage.id).padStart(6, '0') }}</option></select></div>
          <div><label for="report-vendor" class="mb-2 block text-sm font-medium">Vendor</label><select id="report-vendor" v-model="draft.vendor" :class="inputClass"><option value="">Semua vendor</option><option>Hisense</option><option>Skylink</option><option>PLN</option></select></div>
          <div><label for="report-completion" class="mb-2 block text-sm font-medium">Kelengkapan Sekolah</label><select id="report-completion" v-model="draft.completion" :class="inputClass"><option value="">Semua status</option><option value="complete">Lengkap</option><option value="incomplete">Belum lengkap</option><option value="unknown">Belum diketahui</option></select></div>
          <div><label for="report-search" class="mb-2 block text-sm font-medium">Cari serial number / sekolah</label><input id="report-search" v-model="draft.search" type="search" maxlength="120" :class="inputClass" placeholder="Serial number, NPSN, sekolah, label" /></div>
        </div>
        <div class="mt-4 flex flex-wrap gap-3"><button type="submit" :class="buttonClass"><AppIcon name="search" />Terapkan Filter</button><button type="button" :class="buttonClass" @click="resetFilters"><AppIcon name="close" />Reset Filter</button><button type="button" :class="buttonClass" :disabled="loading" @click="loadReport"><AppIcon name="refresh" :class="{ 'animate-spin': loading }" />Muat Ulang</button></div>
      </form>
      <p v-if="error" role="alert" class="mt-5 text-sm text-red-700">{{ error }}</p><p v-if="exportError" role="alert" class="mt-5 text-sm text-red-700">{{ exportError }}</p>
      <p v-if="loading && !report" role="status" class="py-10 text-muted">Memuat rekap…</p>
      <template v-if="report">
        <div class="grid gap-6 border-b border-stone-200 py-8 sm:grid-cols-2 xl:grid-cols-4"><div v-for="metric in metrics" :key="metric.label"><p class="text-sm text-muted">{{ metric.label }}</p><p class="mt-2 text-4xl font-bold tabular-nums text-sky-700">{{ metric.value.toLocaleString('id-ID') }}</p></div></div>
        <p class="mt-4 text-sm">{{ report.summary.completeSchools }} sekolah lengkap · {{ report.summary.incompleteSchools }} belum lengkap · {{ report.summary.unknownSchools }} belum diketahui</p>
        <p class="mt-2 text-xs leading-5 text-muted">Total PID mencakup serial number unik sekolah terscan serta alokasi jumlah_pid dari database untuk sekolah yang belum pernah discan. Progres sekolah terscan dihitung lintas penyimpanan Hisense. Duplikat dihitung sekali. Scan belum terverifikasi dan vendor tanpa integrasi tidak masuk total PID diketahui.</p>
        <section id="sekolah-belum-lengkap" class="mt-8 scroll-mt-6 rounded-xl border border-amber-200 p-4 sm:p-5" aria-labelledby="incomplete-schools-heading" :aria-busy="loading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="incomplete-schools-heading" class="text-lg font-semibold">Detail sekolah belum lengkap</h2>
            <p class="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800" role="status">{{ report.incompleteSchools.totalRows.toLocaleString('id-ID') }} sekolah</p>
          </div>
          <p class="mt-2 text-xs leading-5 text-muted">Termasuk sekolah database yang belum pernah discan: terscan 0 dan total BAPP sesuai alokasi jumlah PID. Sekolah yang sudah discan menggunakan total terverifikasi dari Hisense. Jumlah mencakup seluruh halaman; scan duplikat dihitung sekali.</p>
          <p class="mt-2 text-sm font-medium text-amber-800">Belum pernah discan: {{ report.summary.unscannedSchools.toLocaleString('id-ID') }} sekolah.</p>
          <p class="mt-1 text-xs text-muted">Sekolah yang belum pernah discan belum memiliki vendor atau penyimpanan. Pilih semua vendor dan semua penyimpanan untuk menampilkannya. Sekolah tanpa alokasi PID tidak dihitung sebagai kekurangan BAPP.</p>
          <p v-if="!report.incompleteSchools.totalRows" class="py-8 text-center text-sm text-muted">Tidak ada sekolah berstatus belum lengkap pada hasil filter. Sekolah berstatus belum diketahui belum dapat dinilai kelengkapannya.</p>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <caption class="sr-only">Daftar sekolah yang BAPP-nya belum lengkap</caption>
              <thead class="border-y border-stone-200 bg-stone-50 text-xs text-muted"><tr><th scope="col" class="px-3 py-3">Sekolah / NPSN</th><th scope="col" class="px-3 py-3">Vendor</th><th scope="col" class="px-3 py-3 text-right">Sudah terscan</th><th scope="col" class="px-3 py-3 text-right">Total BAPP</th><th scope="col" class="px-3 py-3 text-right">Belum terscan</th><th scope="col" class="px-3 py-3">Penyimpanan</th></tr></thead>
              <tbody class="divide-y divide-stone-100"><tr v-for="school in report.incompleteSchools.data" :key="`${school.vendor}:${school.npsn}`">
                <th scope="row" class="min-w-[200px] px-3 py-4 font-medium"><p>{{ school.schoolName || 'Nama sekolah belum tersedia' }}</p><p class="mt-1 font-mono text-xs text-muted">{{ school.npsn }}</p></th>
                <td class="px-3 py-4">{{ school.vendor }}</td><td class="px-3 py-4 text-right tabular-nums">{{ school.scanned.toLocaleString('id-ID') }}</td><td class="px-3 py-4 text-right tabular-nums">{{ school.total.toLocaleString('id-ID') }}</td><td class="px-3 py-4 text-right font-semibold tabular-nums text-amber-800">{{ school.missing.toLocaleString('id-ID') }}</td><td class="min-w-[160px] px-3 py-4">{{ school.storages.length ? school.storages.join(', ') : 'Belum pernah discan' }}</td>
              </tr></tbody>
            </table>
          </div>
          <nav v-if="report.incompleteSchools.totalRows > report.incompleteSchools.pageSize" aria-label="Halaman sekolah belum lengkap" class="mt-5 flex flex-wrap items-center justify-end gap-3 text-sm">
            <button type="button" :class="buttonClass" :disabled="schoolPage <= 1 || loading" @click="schoolPage--; loadReport()">Sebelumnya</button>
            <span>Halaman {{ report.incompleteSchools.page }} / {{ Math.ceil(report.incompleteSchools.totalRows / report.incompleteSchools.pageSize) }}</span>
            <button type="button" :class="buttonClass" :disabled="schoolPage * report.incompleteSchools.pageSize >= report.incompleteSchools.totalRows || loading" @click="schoolPage++; loadReport()">Berikutnya</button>
          </nav>
        </section>
        <div class="mt-8 flex flex-wrap items-center justify-between gap-3"><h2 class="text-lg font-semibold">Serial Number Terscan <span class="text-sm font-normal text-muted">{{ report.totalRows }} scan · {{ report.summary.uniqueTransactions }} serial number unik</span></h2><p class="text-xs text-muted">Diperbarui {{ date(report.generatedAt) }} WIB</p></div>
        <p class="mt-2 text-xs text-muted">Excel memuat seluruh hasil filter dalam sheet Ringkasan, Serial Number, dan Rekap Sekolah.</p>
        <p v-if="!report.data.length" class="py-10 text-center text-muted">Tidak ada serial number yang sesuai filter.</p>
        <div v-else class="mt-5 overflow-x-auto"><table class="w-full text-left text-sm">
          <thead class="border-y border-stone-200 bg-stone-50 text-xs text-muted"><tr><th class="px-3 py-4">Waktu (WIB)</th><th class="px-3 py-4">Serial Number</th><th class="px-3 py-4">Sekolah / NPSN</th><th class="px-3 py-4">Penyimpanan</th><th class="px-3 py-4">Vendor</th><th class="px-3 py-4">Jumlah BAPP</th><th class="px-3 py-4">Kelengkapan Sekolah</th><th class="px-3 py-4">Validasi</th><th class="px-3 py-4">Petugas</th></tr></thead>
          <tbody class="divide-y divide-stone-100"><tr v-for="row in report.data" :key="row.id" :class="row.occurrences > 1 ? 'bg-amber-50/30' : ''">
            <td class="whitespace-nowrap px-3 py-4 text-xs">{{ date(row.createdAt) }}</td><td class="px-3 py-4"><p class="font-mono">{{ row.barcode }}</p><span v-if="row.occurrences > 1" class="mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">Duplikat · {{ row.occurrences }} scan</span></td>
            <td class="min-w-[180px] px-3 py-4"><p>{{ row.schoolName || '—' }}</p><p class="mt-1 font-mono text-xs text-muted">{{ row.npsn || '—' }}</p></td>
            <td class="min-w-[160px] px-3 py-4"><p class="font-semibold">{{ row.storageName }}</p><p class="mt-1 text-xs font-medium text-sky-700">{{ row.folderNumber === null ? 'Map belum ditentukan' : `Map ${row.folderNumber}` }}</p><p class="mt-1 text-xs text-muted">{{ row.storageType }} · BAPP-{{ String(row.storageId).padStart(6, '0') }}</p></td><td class="px-3 py-4">{{ row.vendor }}</td>
            <td class="px-3 py-4 font-semibold tabular-nums">{{ row.completion !== 'unknown' ? `${row.schoolProgress?.scanned}/${row.schoolProgress?.total}` : '—' }}</td><td class="px-3 py-4"><span class="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold" :class="completionClasses[row.completion]">{{ completionLabels[row.completion] }}</span></td><td class="px-3 py-4">{{ validationLabels[row.validationStatus] || row.validationStatus }}</td><td class="px-3 py-4">{{ row.scannedBy || '—' }}</td>
          </tr></tbody>
        </table></div>
        <div v-if="report.totalRows > report.pageSize" class="mt-5 flex flex-wrap items-center justify-end gap-3 text-sm"><button type="button" :class="buttonClass" :disabled="page <= 1 || loading" @click="page--; loadReport()"><AppIcon name="arrow-left" />Sebelumnya</button><span>Halaman {{ page }} / {{ Math.ceil(report.totalRows / report.pageSize) }}</span><button type="button" :class="buttonClass" :disabled="page * report.pageSize >= report.totalRows || loading" @click="page++; loadReport()">Berikutnya<AppIcon name="arrow-right" /></button></div>
      </template>
    </main>
  </AppShell>
</template>
