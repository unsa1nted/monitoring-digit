<script setup lang="ts">
useHead({ title: 'Kelola BAPP | Dashboard Pemantauan Digitalisasi Pembelajaran SMK' })
type Reviewer = { id: number; namaPetugas: string; userPetugas: string; alokasiPersen: number | null }
const config = useRuntimeConfig()
const { data, error, refresh } = await useFetch<{ reviewers: Reviewer[] }>('/api/admin/bapp-review', {
  baseURL: config.public.apiBase,
  credentials: 'include',
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined
})
const { data: pendingDistribution, refresh: refreshPendingDistribution } = await useFetch<{ count: number }>('/api/admin/bapp-review/pending-distribution', {
  baseURL: config.public.apiBase,
  credentials: 'include',
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined
})
const distributionOpen = ref(false)
const distributionButton = ref<HTMLButtonElement | null>(null)
const distributionCloseButton = ref<HTMLButtonElement | null>(null)
const distributing = ref(false)
const distributionCounts = reactive<Record<number, number>>({})
const distributionTotal = computed(() => (data.value?.reviewers ?? []).reduce((sum, item) => sum + (Number(distributionCounts[item.id]) || 0), 0))
async function openDistribution() {
  problem.value = ''
  await refreshPendingDistribution()
  for (const item of data.value?.reviewers ?? []) distributionCounts[item.id] = 0
  distributionOpen.value = true
  await nextTick()
  distributionCloseButton.value?.focus()
}
function closeDistribution() {
  distributionOpen.value = false
  nextTick(() => distributionButton.value?.focus())
}
function distributeEvenly() {
  const reviewers = data.value?.reviewers ?? []
  const count = pendingDistribution.value?.count ?? 0
  reviewers.forEach((item, index) => { distributionCounts[item.id] = Math.floor(count / reviewers.length) + (index < count % reviewers.length ? 1 : 0) })
}
async function saveDistribution() {
  if (distributing.value) return
  const available = pendingDistribution.value?.count ?? 0
  const allocations = (data.value?.reviewers ?? []).map(item => ({ reviewerId: item.id, count: Number(distributionCounts[item.id]) || 0 }))
  if (allocations.some(item => !Number.isSafeInteger(item.count) || item.count < 0) || distributionTotal.value < 1 || distributionTotal.value > available) {
    problem.value = `Jumlah pembagian harus 1 sampai ${available} BAPP.`
    return
  }
  distributing.value = true
  problem.value = message.value = ''
  try {
    const result = await $fetch<{ allocated: number }>('/api/admin/bapp-review/distribute', { baseURL: config.public.apiBase, credentials: 'include', method: 'POST', body: { allocations } })
    closeDistribution()
    message.value = `${result.allocated} BAPP dibagikan ke petugas.`
    await refreshPendingDistribution()
  } catch (error) { problem.value = errorText(error); await refreshPendingDistribution() }
  finally { distributing.value = false }
}
const reviewer = reactive({ namaPetugas: '', userPetugas: '' })
const importFile = ref<File | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const reviewImportFile = ref<File | null>(null)
const reviewImportInput = ref<HTMLInputElement | null>(null)
const importingReviews = ref(false)
const savingReviewer = ref(false)
const savingAllocation = ref<number | null>(null)
const syncingHisenseReviewers = ref(false)
type SyncJob = { id: string; status: 'running' | 'done' | 'error'; percent: number; stage: string; result?: { created: number; updated: number; allocated: number; skippedStatus: number; skippedDuplicate: number }; message?: string }
type SyncRun = { id: number; source: 'automatic' | 'manual'; syncedAt: string; created: number; updated: number; allocated: number; distribution: Array<{ userPetugas: string; namaPetugas: string; count: number }> }
const { data: historyData, error: historyError, refresh: refreshHistory } = await useFetch<{ runs: SyncRun[] }>('/api/admin/bapp-review/sync-hisense/history', {
  baseURL: config.public.apiBase,
  credentials: 'include',
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined
})
const syncDate = (value: string) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const syncJob = ref<SyncJob | null>(null)
let syncTimer: ReturnType<typeof setTimeout> | null = null
const message = ref('')
const problem = ref('')
const inputClass = 'w-full rounded-theme border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100'
const errorText = (error: any) => error?.data?.message ?? 'Permintaan gagal. Coba lagi.'

async function importExcel() {
  if (!importFile.value || importing.value) return
  importing.value = true
  problem.value = message.value = ''
  try {
    const form = new FormData()
    form.append('file', importFile.value)
    const result = await $fetch<{ created: number; updated: number; allocated: number; skippedStatus: number; skippedDuplicate: number }>('/api/admin/bapp-review/import', { baseURL: config.public.apiBase, credentials: 'include', method: 'POST', body: form, timeout: 300_000 })
    message.value = `${result.created} transaksi baru, ${result.allocated} transaksi baru dibagi ke petugas, ${result.updated} diperbarui di master_bapp. Dilewati: ${result.skippedStatus} status progress lain, ${result.skippedDuplicate} ID Transaksi duplikat.`
    importFile.value = null
    if (importInput.value) importInput.value.value = ''
    await refresh()
  } catch (error) { problem.value = errorText(error) }
  finally { importing.value = false }
}
async function pollHisenseSync() {
  try {
    syncJob.value = await $fetch<SyncJob | null>('/api/admin/bapp-review/sync-hisense', { baseURL: config.public.apiBase, credentials: 'include' })
    if (syncJob.value?.status === 'done' && syncJob.value.result && syncJob.value.id !== lastReportedSyncId) {
      lastReportedSyncId = syncJob.value.id
      const result = syncJob.value.result
      message.value = `${result.created} transaksi baru, ${result.updated} diperbarui dari Hisense.`
      await refresh()
      await refreshHistory()
      await refreshPendingDistribution()
    } else if (syncJob.value?.status === 'error' && syncJob.value.id !== lastReportedSyncId) {
      lastReportedSyncId = syncJob.value.id
      problem.value = syncJob.value.message ?? 'Sinkronisasi Hisense gagal.'
    }
  } catch (error) { problem.value = errorText(error) }
  finally { if (syncPollingActive) syncTimer = setTimeout(pollHisenseSync, syncJob.value?.status === 'running' ? 1000 : 30_000) }
}
let lastReportedSyncId = ''
let syncPollingActive = true
async function syncHisenseApi() {
  if (syncJob.value?.status === 'running') return
  problem.value = message.value = ''
  try {
    syncJob.value = await $fetch<SyncJob>('/api/admin/bapp-review/sync-hisense', { baseURL: config.public.apiBase, credentials: 'include', method: 'POST' })
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(pollHisenseSync, 1000)
  } catch (error) { problem.value = errorText(error) }
}
onMounted(pollHisenseSync)
onUnmounted(() => { syncPollingActive = false; if (syncTimer) clearTimeout(syncTimer) })
async function importReviews() {
  if (!reviewImportFile.value || importingReviews.value) return
  importingReviews.value = true
  problem.value = message.value = ''
  try {
    const form = new FormData()
    form.append('file', reviewImportFile.value)
    const result = await $fetch<{ updated: number; updatedReviewer: number; missingReviewer: number; unregisteredReviewer: number; unmatched: number; ambiguous: number; skippedDuplicate: number }>('/api/admin/bapp-review/import-reviews', { baseURL: config.public.apiBase, credentials: 'include', method: 'POST', body: form, timeout: 300_000 })
    message.value = `${result.updated} hasil reviu diperbarui; ${result.updatedReviewer} petugas_reviu diisi/diperbarui. Dilewati: ${result.skippedDuplicate} ID Transaksi duplikat, ${result.unmatched} Serial Number tidak ditemukan, ${result.ambiguous} Serial Number ganda tanpa ID Transaksi cocok, ${result.missingReviewer} petugas kosong, ${result.unregisteredReviewer} petugas tidak terdaftar.`
    await refresh()
    reviewImportFile.value = null
    if (reviewImportInput.value) reviewImportInput.value.value = ''
  } catch (error) { problem.value = errorText(error) }
  finally { importingReviews.value = false }
}

async function addReviewer() {
  if (savingReviewer.value) return
  savingReviewer.value = true
  problem.value = message.value = ''
  try {
    await $fetch('/api/admin/bapp-review/reviewers', { baseURL: config.public.apiBase, credentials: 'include', method: 'POST', body: reviewer })
    Object.assign(reviewer, { namaPetugas: '', userPetugas: '' })
    message.value = 'Petugas reviewer ditambahkan.'
    await refresh()
  } catch (error) { problem.value = errorText(error) }
  finally { savingReviewer.value = false }
}
async function saveAllocation(item: Reviewer, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.trim()
  const percent = value === '' ? null : Number(value)
  if (percent !== null && (!Number.isInteger(percent) || percent < 0 || percent > 100)) {
    problem.value = 'Persentase harus bilangan bulat 0 sampai 100.'
    input.value = item.alokasiPersen?.toString() ?? ''
    return
  }
  savingAllocation.value = item.id
  problem.value = message.value = ''
  try {
    await $fetch(`/api/admin/bapp-review/reviewers/${item.id}/allocation`, { baseURL: config.public.apiBase, credentials: 'include', method: 'PATCH', body: { alokasiPersen: percent } })
    message.value = 'Persentase pembagian disimpan.'
    await refresh()
  } catch (error) {
    problem.value = errorText(error)
    input.value = item.alokasiPersen?.toString() ?? ''
  } finally { savingAllocation.value = null }
}

async function syncHisenseReviewers() {
  if (syncingHisenseReviewers.value) return
  syncingHisenseReviewers.value = true
  problem.value = message.value = ''
  try {
    const result = await $fetch<{ total: number; empty: number; alreadyFilled: number; updated: number; withoutApproval: number; tooLong: number; notFound: number }>('/api/admin/bapp-review/reviewers/sync-hisense', { baseURL: config.public.apiBase, credentials: 'include', method: 'POST', timeout: 300_000 })
    message.value = `${result.updated} dari ${result.empty} petugas_reviu kosong diisi dari approved_by_moe. ${result.alreadyFilled} dari ${result.total} sudah terisi dan tidak diubah; ${result.withoutApproval} tanpa approved_by_moe; ${result.tooLong} nama terlalu panjang; ${result.notFound} ID transaksi tidak ditemukan di Hisense.`
  } catch (error) { problem.value = errorText(error) }
  finally { syncingHisenseReviewers.value = false }
}

</script>

<template>
  <AppShell>
    <header class="border-b border-stone-200 bg-white px-5 pb-6 pt-20 sm:px-8 lg:pt-6">
      <h1 class="text-2xl font-semibold">Kelola BAPP</h1>
      <p class="mt-2 text-sm text-muted">Data Cek BAPP mengikuti Petugas Reviu pada setiap transaksi di master_bapp.</p>
    </header>
    <main class="space-y-6 p-5 sm:p-8">
      <p v-if="error" role="alert" class="text-sm text-red-700">Daftar petugas reviewer belum dapat dimuat.</p>
      <p v-if="problem" role="alert" class="text-sm text-red-700">{{ problem }}</p>
      <p v-if="message" role="status" class="text-sm text-teal-700">{{ message }}</p>
      <section class="space-y-3 rounded-theme border border-stone-200 bg-white p-5 shadow-card">
        <h2 class="text-lg font-semibold">Sinkron API Hisense</h2>
        <p class="text-sm text-muted">Sistem memeriksa daftar transaksi setiap 10 menit dan mengambil detail baru atau berubah secara bulk. Transaksi baru berstatus INSTALASI SELESAI tanpa riwayat revisi menunggu pembagian oleh admin.</p>
        <button type="button" :disabled="syncJob?.status === 'running'" class="rounded-theme bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" @click="syncHisenseApi">{{ syncJob?.status === 'running' ? 'Sinkronisasi berjalan…' : 'Sinkron dari Hisense' }}</button>
        <button ref="distributionButton" type="button" class="ml-2 rounded-theme border border-sky-600 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-100" @click="openDistribution">{{ pendingDistribution?.count ?? 0 }} BAPP Tersedia Untuk Dibagikan</button>
        <div v-if="syncJob?.status === 'running'" role="status" class="space-y-1 text-sm text-muted">
          <p>{{ syncJob.stage }} — {{ syncJob.percent }}%</p>
          <progress :value="syncJob.percent" max="100" class="h-3 w-full accent-sky-600">{{ syncJob.percent }}%</progress>
        </div>
        <div class="border-t border-stone-200 pt-4">
          <h3 class="font-semibold">Riwayat sinkron Hisense</h3>
          <p v-if="historyError" class="mt-2 text-sm text-red-700">Riwayat sinkron belum dapat dimuat.</p>
          <p v-else-if="!historyData?.runs?.length" class="mt-2 text-sm text-muted">Belum ada sinkronisasi Hisense yang selesai.</p>
          <div v-else class="mt-3 space-y-2">
            <details v-for="run in historyData.runs" :key="run.id" class="rounded-theme border border-stone-200 bg-stone-50 p-3">
              <summary class="cursor-pointer text-sm font-medium">{{ syncDate(run.syncedAt) }} WIB · {{ run.source === 'automatic' ? 'Otomatis' : 'Manual' }} · {{ run.created }} transaksi baru</summary>
              <div class="mt-3 border-t border-stone-200 pt-3 text-sm">
                <p class="text-muted">{{ run.created }} transaksi baru, {{ run.updated }} transaksi diperbarui.</p>
                <p v-if="run.allocated" class="mt-2 font-medium">Pembagian saat sinkron</p>
                <ul v-if="run.allocated && run.distribution.length" class="mt-2 max-h-64 divide-y divide-stone-200 overflow-y-auto">
                  <li v-for="item in run.distribution" :key="item.userPetugas" class="flex justify-between gap-3 py-1.5"><span>{{ item.namaPetugas }} ({{ item.userPetugas }})</span><strong>{{ item.count }} BAPP</strong></li>
                </ul>
                <p v-else class="mt-2 text-muted">Tidak ada pembagian saat sinkron.</p>
              </div>
            </details>
          </div>
        </div>
      </section>
      <div v-if="distributionOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @keydown.esc="closeDistribution">
        <div role="dialog" aria-modal="true" aria-labelledby="distribution-title" class="w-full max-w-xl rounded-theme bg-white p-6 shadow-xl">
          <div class="flex items-start justify-between gap-4"><h2 id="distribution-title" class="text-lg font-semibold">Bagikan {{ pendingDistribution?.count ?? 0 }} BAPP</h2><button ref="distributionCloseButton" type="button" aria-label="Tutup" class="text-xl text-muted" @click="closeDistribution">×</button></div>
          <p class="mt-2 text-sm text-muted">Isi jumlah BAPP untuk setiap petugas. Sisa BAPP tetap tersedia untuk pembagian berikutnya.</p>
          <form class="mt-4 space-y-4" @submit.prevent="saveDistribution">
            <div class="max-h-80 space-y-3 overflow-y-auto">
              <label v-for="item in data?.reviewers ?? []" :key="item.id" class="flex items-center justify-between gap-4 text-sm"><span>{{ item.namaPetugas }} ({{ item.userPetugas }})</span><input v-model.number="distributionCounts[item.id]" type="number" min="0" :max="pendingDistribution?.count ?? 0" step="1" required class="w-24 rounded-theme border border-stone-300 px-3 py-2 text-right"></label>
            </div>
            <p class="text-sm font-medium">{{ distributionTotal }} dari {{ pendingDistribution?.count ?? 0 }} BAPP dipilih</p>
            <p v-if="problem" role="alert" class="text-sm text-red-700">{{ problem }}</p>
            <div class="flex flex-wrap gap-2"><button type="button" :disabled="!data?.reviewers?.length" class="rounded-theme border border-stone-300 px-4 py-2 text-sm font-medium disabled:opacity-50" @click="distributeEvenly">Bagikan merata</button><button type="submit" :disabled="distributing || !distributionTotal || distributionTotal > (pendingDistribution?.count ?? 0)" class="rounded-theme bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{{ distributing ? 'Membagikan…' : 'Simpan pembagian' }}</button></div>
          </form>
        </div>
      </div>
      <form class="space-y-3 rounded-theme border border-stone-200 bg-white p-5 shadow-card" @submit.prevent="importExcel">
        <h2 class="text-lg font-semibold">Impor Excel BAPP</h2>
        <p class="text-sm text-muted">Impor hanya status DISETUJUI, INSTALASI SELESAI, REVISI, SESUAI APIP, dan REVIU APIP. Transaksi baru dengan Resubmit FALSE dan INSTALASI SELESAI dibagi sesuai persentase petugas. Sisa persentase dibagi rata ke petugas tanpa persentase. Impor ulang tidak mengubah petugas transaksi tersebut. Hasil reviu foto yang sudah tersimpan tetap.</p>
        <input ref="importInput" type="file" accept=".xlsx" required class="block w-full text-sm" @change="importFile = ($event.target as HTMLInputElement).files?.[0] ?? null">
        <button type="submit" :disabled="!importFile || importing" class="rounded-theme bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{{ importing ? 'Mengimpor…' : 'Impor Excel ke Master BAPP' }}</button>
      </form>
      <form class="space-y-3 rounded-theme border border-stone-200 bg-white p-5 shadow-card" @submit.prevent="importReviews">
        <h2 class="text-lg font-semibold">Impor Hasil Reviu BAPP</h2>
        <p class="text-sm text-muted">Cocokkan Serial Number dengan master_bapp; jika ganda, gunakan ID Transaksi. Sel foto yang kosong tetap kosong. Petugas Reviu di Excel memperbarui petugas pada transaksi yang cocok.</p>
        <input ref="reviewImportInput" type="file" accept=".xlsx" required class="block w-full text-sm" @change="reviewImportFile = ($event.target as HTMLInputElement).files?.[0] ?? null">
        <button type="submit" :disabled="!reviewImportFile || importingReviews" class="rounded-theme bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{{ importingReviews ? 'Mengimpor…' : 'Impor Hasil Reviu' }}</button>
      </form>
      <div class="grid gap-6 lg:grid-cols-2">
        <form class="space-y-4 rounded-theme border border-stone-200 bg-white p-5 shadow-card" @submit.prevent="addReviewer">
          <h2 class="text-lg font-semibold">Petugas reviewer</h2>
          <div><label for="nama-petugas" class="mb-2 block text-sm font-medium">Nama petugas</label><input id="nama-petugas" v-model="reviewer.namaPetugas" :class="inputClass" maxlength="120" required></div>
          <div><label for="user-petugas" class="mb-2 block text-sm font-medium">Username petugas</label><input id="user-petugas" v-model="reviewer.userPetugas" :class="inputClass" maxlength="80" minlength="3" pattern="[a-zA-Z0-9_.-]+" required></div>
          <button type="submit" :disabled="savingReviewer" class="rounded-theme bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{{ savingReviewer ? 'Menyimpan…' : 'Tambah petugas' }}</button>
          <p class="text-sm text-muted">Isi persentase khusus per petugas. Kosong berarti mendapat bagian rata dari sisa. Jika semua petugas diisi, total harus 100%.</p>
          <ul v-if="data?.reviewers?.length" class="max-h-64 space-y-2 overflow-auto border-t border-stone-200 pt-3 text-sm text-muted"><li v-for="item in data.reviewers" :key="item.id" class="flex items-center justify-between gap-3"><span>{{ item.namaPetugas }} ({{ item.userPetugas }})</span><label class="flex items-center gap-1"><span class="sr-only">Persentase {{ item.namaPetugas }}</span><input type="number" min="0" max="100" step="1" :value="item.alokasiPersen ?? ''" :disabled="savingAllocation !== null" class="w-20 rounded-theme border border-stone-300 px-2 py-1 text-sm" placeholder="Rata" @change="saveAllocation(item, $event)"><span>%</span></label></li></ul>
        </form>
        <section class="space-y-3 rounded-theme border border-stone-200 bg-white p-5 shadow-card">
          <h2 class="text-lg font-semibold">Ambil Data Petugas</h2>
          <p class="text-sm text-muted">Isi petugas_reviu yang kosong dari approved_by_moe Hisense berdasarkan ID Transaksi.</p>
          <button type="button" :disabled="syncingHisenseReviewers" class="rounded-theme border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone-50 disabled:opacity-50" @click="syncHisenseReviewers">{{ syncingHisenseReviewers ? 'Mengambil dari Hisense…' : 'Ambil Data Petugas' }}</button>
        </section>
      </div>
    </main>
  </AppShell>
</template>
