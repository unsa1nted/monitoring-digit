<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
useHead({ title: 'Bapp Fisik | Dashboard Pemantauan Digitalisasi Pembelajaran SMK' })
type Storage = { id: number; name: string; type: 'Dus' | 'Kontainer' | 'Penyimpanan Lainnya'; vendor: 'Hisense' | 'Skylink' | 'PLN' }
type Step = 'choose' | 'create' | 'existing' | 'created' | 'folders' | 'scan'
type SchoolProgress = { status: 'pending' | 'checking' | 'ready' | 'error'; scanned: number | null; total: number | null; checkedAt: string | null }
type Scan = { id: number; barcode: string; createdAt: string; validationStatus: 'pending' | 'checking' | 'valid' | 'invalid' | 'error' | 'unsupported'; validationMessage: string | null; schoolName: string | null; npsn: string | null; scannedBy: string | null; occurrences: number; schoolProgress: SchoolProgress | null }
type ScanResponse = { data: (Scan & { isDuplicate: boolean })[]; summary: { totalScans: number; documents: number }; tabs: { details: number; duplicates: number }; totalRows: number; page: number; pageSize: number }
type Folder = { id: number; storageId: number; number: number }
type PendingScan = { folderId: number; requestId: string; storageId: number; barcode: string; saving: boolean; error: string }
const config = useRuntimeConfig()
const step = ref<Step>('choose')
const selectedStorage = ref<Storage | null>(null)
const selectedFolder = ref<Folder | null>(null)
const folders = ref<Folder[]>([])
const folderNumber = ref(1)
const folderError = ref('')
const loadingFolders = ref(false)
const creatingFolder = ref(false)
let folderLoadVersion = 0
const storageName = ref('')
const storageType = ref<Storage['type']>('Dus')
const storageVendor = ref<Storage['vendor'] | ''>('')
const printedAt = ref('')
function updatePrintDate() {
  printedAt.value = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date()) + ' WIB'
}
const saving = ref(false)
const storageError = ref('')
const storages = ref<Storage[]>([])
const loadingStorages = ref(false)
const search = ref('')
const matchingStorages = computed(() => storages.value.filter(storage => `${storage.name} ${storage.type} ${storage.vendor}`.toLowerCase().includes(search.value.toLowerCase())))
const storageCode = (id: number) => `BAPP-${String(id).padStart(6, '0')}`
const inputClass = 'w-full rounded-theme border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
const primaryClass = 'inline-flex items-center justify-center gap-2 rounded-theme bg-ink px-4 py-3 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50'
const secondaryClass = 'inline-flex items-center justify-center gap-2 rounded-theme border border-stone-300 px-4 py-3 text-sm font-medium hover:bg-stone-50 disabled:opacity-50'
const barcodeInput = ref<HTMLInputElement | null>(null)
const barcode = ref('')
const lastBarcode = ref('')
const focused = ref(false)
const errorMessage = ref('')
const scans = ref<ScanResponse['data']>([])
const scanTab = ref<'details' | 'duplicates'>('details')
const scanTabCounts = ref({ details: 0, duplicates: 0 })
const tabTotalRows = ref(0)
const scanSummary = ref<ScanResponse['summary'] | null>(null)
const scanPage = ref(1)
const loadingScans = ref(false)
const scanLoadError = ref('')
const pendingScans = ref<PendingScan[]>([])
const rechecking = ref<number[]>([])
const recheckingSchools = ref<number[]>([])
let scanLoadVersion = 0
let pollTimer: ReturnType<typeof setInterval> | undefined
const statusLabels = { pending: 'Menunggu pengecekan', checking: 'Sedang mengecek', valid: 'Valid', invalid: 'Tidak valid', error: 'Perlu cek ulang', unsupported: 'Pengecekan belum tersedia' }
const statusClasses = { pending: 'bg-stone-100 text-stone-700', checking: 'bg-sky-50 text-sky-700', valid: 'bg-teal-50 text-teal-800', invalid: 'bg-red-50 text-red-700', error: 'bg-amber-50 text-amber-800', unsupported: 'bg-stone-100 text-stone-700' }
const formatScanDate = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(value))

async function loadScans() {
  if (!selectedStorage.value || !selectedFolder.value || step.value !== 'scan') return
  const storageId = selectedStorage.value.id
  const version = ++scanLoadVersion
  loadingScans.value = true
  try {
    const result = await $fetch<ScanResponse>(`/api/bapp-fisik/storages/${storageId}/scans`, {
      baseURL: config.public.apiBase, credentials: 'include', query: { page: scanPage.value, tab: scanTab.value, folderId: selectedFolder.value?.id }, timeout: 10000, retry: 0
    })
    if (version !== scanLoadVersion || selectedStorage.value?.id !== storageId) return
    scans.value = result.data
    scanTabCounts.value = result.tabs
    tabTotalRows.value = result.totalRows
    scanSummary.value = result.summary
    scanLoadError.value = ''
  } catch {
    if (version === scanLoadVersion) scanLoadError.value = 'Tabel belum dapat diperbarui. Data yang tersimpan tetap aman; coba muat ulang.'
  } finally { if (version === scanLoadVersion) loadingScans.value = false }
}

function selectScanTab(tab: 'details' | 'duplicates', focus = false) {
  scanTab.value = tab
  scanPage.value = 1
  scans.value = []
  void loadScans()
  if (focus) document.getElementById(`scan-tab-${tab}`)?.focus()
}

function newRequestId() {
  // getRandomValues also works when the dashboard is opened over a local LAN.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function persistScan(entry: PendingScan) {
  if (entry.saving) return
  entry.saving = true
  entry.error = ''
  try {
    const saved = await $fetch<{ isDuplicate: boolean }>(`/api/bapp-fisik/storages/${entry.storageId}/scans`, {
      baseURL: config.public.apiBase, credentials: 'include', method: 'POST',
      body: { barcode: entry.barcode, requestId: entry.requestId, folderId: entry.folderId }, retry: 0, timeout: 15000
    })
    pendingScans.value = pendingScans.value.filter(item => item.requestId !== entry.requestId)
    if (selectedStorage.value?.id === entry.storageId && selectedFolder.value?.id === entry.folderId) {
      lastBarcode.value = entry.barcode
      const nextTab = saved.isDuplicate ? 'duplicates' : 'details'
      if (scanTab.value !== nextTab) scans.value = []
      scanTab.value = nextTab
      scanPage.value = 1
      await loadScans()
    }
  } catch (error: any) {
    entry.error = error?.data?.message ?? 'Penyimpanan belum terkonfirmasi. Coba simpan ulang; tidak akan membuat scan ganda.'
  } finally { entry.saving = false }
}

async function recheckScan(scan: Scan) {
  if (!selectedStorage.value || rechecking.value.includes(scan.id)) return
  rechecking.value.push(scan.id)
  try {
    await $fetch(`/api/bapp-fisik/storages/${selectedStorage.value.id}/scans/${scan.id}/recheck`, { baseURL: config.public.apiBase, credentials: 'include', method: 'POST' })
    await loadScans()
  } catch { errorMessage.value = 'Pengecekan ulang belum dapat dijadwalkan. Silakan coba lagi.' }
  finally { rechecking.value = rechecking.value.filter(id => id !== scan.id) }
}

function preventUnsavedExit(event: BeforeUnloadEvent) {
  if (pendingScans.value.length) { event.preventDefault(); event.returnValue = '' }
}

async function recheckSchool(scan: Scan) {
  if (!selectedStorage.value || recheckingSchools.value.includes(scan.id)) return
  recheckingSchools.value.push(scan.id)
  try {
    await $fetch(`/api/bapp-fisik/storages/${selectedStorage.value.id}/scans/${scan.id}/school-recheck`, { baseURL: config.public.apiBase, credentials: 'include', method: 'POST' })
    await loadScans()
  } catch { errorMessage.value = 'Jumlah BAPP belum dapat dicek ulang. Silakan coba lagi.' }
  finally { recheckingSchools.value = recheckingSchools.value.filter(id => id !== scan.id) }
}
onMounted(() => {
  pollTimer = setInterval(() => { if (step.value === 'scan' && !loadingScans.value && document.visibilityState === 'visible') void loadScans() }, 3000)
  window.addEventListener('beforeunload', preventUnsavedExit)
})
onUnmounted(() => {
  clearInterval(pollTimer)
  window.removeEventListener('beforeunload', preventUnsavedExit)
})

function chooseStorage() {
  if (pendingScans.value.length) return
  scanLoadVersion++
  step.value = 'choose'
  selectedStorage.value = null
  selectedFolder.value = null
  folderLoadVersion++
  barcode.value = ''
  lastBarcode.value = ''
  storageError.value = ''
  errorMessage.value = ''
}

async function loadStorages() {
  step.value = 'existing'
  loadingStorages.value = true
  storageError.value = ''
  try {
    const result = await $fetch<{ data: Storage[] }>('/api/bapp-fisik/storages', { baseURL: config.public.apiBase, credentials: 'include' })
    storages.value = result.data
  } catch {
    storageError.value = 'Penyimpanan tidak dapat dimuat. Silakan coba lagi.'
  } finally { loadingStorages.value = false }
}

async function createStorage() {
  if (saving.value) return
  storageError.value = ''
  if (!storageName.value.trim()) { storageError.value = 'Nama label wajib diisi.'; return }
  if (!storageVendor.value) { storageError.value = 'Pilih vendor terlebih dahulu.'; return }
  saving.value = true
  try {
    const result = await $fetch<{ data: Storage }>('/api/bapp-fisik/storages', {
      baseURL: config.public.apiBase, credentials: 'include', method: 'POST',
      body: { name: storageName.value.trim(), type: storageType.value, vendor: storageVendor.value }
    })
    selectedStorage.value = result.data
    updatePrintDate()
    storageName.value = ''
    step.value = 'created'
  } catch (error: any) {
    storageError.value = error?.data?.message ?? 'Label gagal dibuat. Silakan coba lagi.'
  } finally { saving.value = false }
}

async function startScanning(storage: Storage) {
  if (pendingScans.value.length || creatingFolder.value) return
  scanLoadVersion++
  selectedStorage.value = storage
  selectedFolder.value = null
  step.value = 'folders'
  folders.value = []
  await loadFolders()
}

async function loadFolders() {
  if (!selectedStorage.value) return
  const storageId = selectedStorage.value.id
  const version = ++folderLoadVersion
  loadingFolders.value = true
  folderError.value = ''
  try {
    const result = await $fetch<{ data: Folder[] }>(`/api/bapp-fisik/storages/${storageId}/folders`, { baseURL: config.public.apiBase, credentials: 'include' })
    if (version !== folderLoadVersion) return
    folders.value = result.data
    folderNumber.value = (result.data.at(-1)?.number ?? 0) + 1
  } catch { if (version === folderLoadVersion) folderError.value = 'Daftar map gagal dimuat. Silakan coba lagi.' }
  finally { if (version === folderLoadVersion) loadingFolders.value = false }
}

async function createFolder() {
  if (!selectedStorage.value || creatingFolder.value) return
  if (!Number.isInteger(folderNumber.value) || folderNumber.value < 1 || folderNumber.value > 2147483647) {
    folderError.value = 'Isi nomor map dengan bilangan bulat positif.'
    return
  }
  creatingFolder.value = true
  folderError.value = ''
  try {
    const result = await $fetch<{ data: Folder }>(`/api/bapp-fisik/storages/${selectedStorage.value.id}/folders`, {
      baseURL: config.public.apiBase, credentials: 'include', method: 'POST', body: { number: folderNumber.value }
    })
    await scanFolder(result.data)
  } catch (error: any) { folderError.value = error?.data?.message ?? 'Map gagal dibuat. Silakan coba lagi.' }
  finally { creatingFolder.value = false }
}

async function scanFolder(folder: Folder) {
  if (pendingScans.value.length || folder.storageId !== selectedStorage.value?.id) return
  selectedFolder.value = folder
  updatePrintDate()
  barcode.value = ''
  lastBarcode.value = ''
  errorMessage.value = ''
  scans.value = []
  scanSummary.value = null
  scanTab.value = 'details'
  scanTabCounts.value = { details: 0, duplicates: 0 }
  tabTotalRows.value = 0
  scanPage.value = 1
  scanLoadError.value = ''
  step.value = 'scan'
  void loadScans()
  await nextTick()
  focusScanner()
}

async function printLabel() {
  if (!selectedStorage.value) return
  updatePrintDate()
  await nextTick()
  window.print()
}

function focusScanner() {
  barcodeInput.value?.focus()
  barcodeInput.value?.select()
}

function receiveBarcode() {
  if (!selectedStorage.value || !selectedFolder.value || step.value !== 'scan') return
  const value = barcode.value.trim()
  if (!value || value.length > 160 || /[\x00-\x1f\x7f]/.test(value)) {
    errorMessage.value = 'Scan serial number yang valid (1–160 karakter).'
    focusScanner()
    return
  }
  errorMessage.value = ''
  const entry = reactive<PendingScan>({ requestId: newRequestId(), storageId: selectedStorage.value.id, folderId: selectedFolder.value.id, barcode: value, saving: false, error: '' })
  pendingScans.value.push(entry)
  barcode.value = ''
  void persistScan(entry)
  focusScanner()
}

</script>

<template>
  <AppShell>
    <header class="border-b border-stone-200 bg-white px-5 pb-6 pt-20 sm:px-8 lg:pt-6">
      <div class="w-full">
        <p class="text-xs font-semibold uppercase tracking-wider text-sky-600">Internal</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight">Bapp Fisik</h1>
        <NuxtLink to="/rekap-scan#sekolah-belum-lengkap" :class="secondaryClass" class="mt-4">Detail sekolah belum lengkap<AppIcon name="arrow-right" /></NuxtLink>
      </div>
    </header>
    <main class="min-h-[calc(100dvh-105px)] w-full bg-white px-5 py-8 sm:px-8">
      <section class="w-full">
        <button v-if="step !== 'choose'" type="button" :class="secondaryClass" class="mb-6" :disabled="saving || creatingFolder || pendingScans.length > 0" @click="chooseStorage"><AppIcon name="arrow-left" />Kembali</button>
        <template v-if="step === 'choose'">
          <h2 class="text-xl font-semibold">Pilih Penyimpanan</h2>
          <p class="mt-3 text-sm text-muted">Pilih tempat penyimpanan dokumen sebelum mulai scan.</p>
          <div class="mt-8 divide-y divide-stone-200 border-y border-stone-200">
            <button type="button" class="flex w-full items-center gap-4 px-2 py-8 text-left transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 sm:px-4" @click="step = 'create'; storageError = ''">
              <AppIcon name="plus" class="h-7 w-7 text-sky-700" /><span class="min-w-0 flex-1">
              <span class="block text-lg font-semibold text-sky-800">Buat Baru</span>
              <span class="mt-2 block text-sm text-muted">Buat label untuk tempat penyimpanan baru.</span>
              </span><AppIcon name="arrow-right" class="text-muted" />
            </button>
            <button type="button" class="flex w-full items-center gap-4 px-2 py-8 text-left transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 sm:px-4" @click="search = ''; loadStorages()">
              <AppIcon name="package" class="h-7 w-7 text-sky-700" /><span class="min-w-0 flex-1">
              <span class="block text-lg font-semibold">Sudah Tersedia</span>
              <span class="mt-2 block text-sm text-muted">Gunakan penyimpanan yang sudah dibuat.</span>
              </span><AppIcon name="arrow-right" class="text-muted" />
            </button>
          </div>
        </template>

        <template v-else-if="step === 'create'">
          <h2 class="text-xl font-semibold">Buat Penyimpanan Baru</h2>
          <form class="mt-6 space-y-5" @submit.prevent="createStorage">
            <fieldset :disabled="saving" class="space-y-5">
              <div><label for="storage-name" class="mb-2 block text-sm font-medium">Nama Label</label><input id="storage-name" v-model="storageName" :class="inputClass" required maxlength="120" autocomplete="off" placeholder="Contoh: Bapp Fisik Aceh 01" /></div>
              <div><label for="storage-type" class="mb-2 block text-sm font-medium">Tipe Penyimpanan</label><select id="storage-type" v-model="storageType" :class="inputClass"><option>Dus</option><option>Kontainer</option><option>Penyimpanan Lainnya</option></select></div>
              <div><label for="storage-vendor" class="mb-2 block text-sm font-medium">Vendor</label><select id="storage-vendor" v-model="storageVendor" :class="inputClass" required><option disabled value="">Pilih vendor</option><option>Hisense</option><option>Skylink</option><option>PLN</option></select></div>
              <p v-if="storageError" role="alert" class="text-sm text-red-700">{{ storageError }}</p>
              <div class="flex flex-wrap gap-3"><button type="submit" :class="primaryClass" :disabled="saving"><AppIcon :name="saving ? 'loading' : 'plus'" :class="{ 'animate-spin': saving }" />{{ saving ? 'Membuat label…' : 'Buat Label' }}</button></div>
            </fieldset>
          </form>
        </template>

        <template v-else-if="step === 'existing'">
          <h2 class="text-xl font-semibold">Penyimpanan Sudah Tersedia</h2>
          <label for="storage-search" class="mb-2 mt-6 block text-sm font-medium">Cari penyimpanan</label>
          <input id="storage-search" v-model="search" type="search" :class="inputClass" placeholder="Cari nama label, tipe, atau vendor" />
          <p v-if="loadingStorages" role="status" class="mt-5 text-sm text-muted">Memuat penyimpanan…</p>
          <div v-else-if="storageError" role="alert" class="mt-5 text-sm text-red-700">{{ storageError }} <button type="button" class="underline" @click="loadStorages"><AppIcon name="refresh" class="mr-1 h-4 w-4" />Coba lagi</button></div>
          <p v-else-if="!storages.length" class="mt-5 text-sm text-muted">Belum ada penyimpanan. Pilih Kembali lalu Buat Baru.</p>
          <p v-else-if="!matchingStorages.length" class="mt-5 text-sm text-muted">Tidak ada penyimpanan yang cocok.</p>
          <ul v-else class="mt-5 divide-y divide-stone-200 border-y border-stone-200">
            <li v-for="storage in matchingStorages" :key="storage.id" class="flex flex-wrap items-center justify-between gap-3 py-5">
              <div class="min-w-0"><p class="break-words font-semibold">{{ storage.name }}</p><p class="mt-1 text-xs text-muted">{{ storage.vendor }} · {{ storage.type }} · {{ storageCode(storage.id) }}</p></div>
              <button type="button" :class="primaryClass" :aria-label="`Pilih ${storage.name} dan lanjut scan`" @click="startScanning(storage)"><AppIcon name="scan" />Pilih &amp; Lanjut Scan</button>
            </li>
          </ul>
        </template>

        <template v-else-if="step === 'folders' && selectedStorage">
          <h2 class="text-xl font-semibold">Pilih Map</h2>
          <p class="mt-2 font-medium">{{ selectedStorage.name }}</p>
          <p class="mt-2 text-sm text-muted">Pilih map tempat dokumen disimpan, atau buat nomor map baru.</p>
          <p v-if="loadingFolders" role="status" class="mt-6 text-muted">Memuat map...</p>
          <p v-else-if="!folders.length" class="mt-6 text-sm text-muted">Belum ada map di penyimpanan ini.</p>
          <div class="mt-5 flex flex-wrap gap-3">
            <button v-for="folder in folders" :key="folder.id" type="button" :class="secondaryClass" :disabled="creatingFolder || loadingFolders" @click="scanFolder(folder)">Map {{ folder.number }}</button>
          </div>
          <form class="mt-8 max-w-md space-y-3 border-t border-stone-200 pt-6" @submit.prevent="createFolder">
            <label for="folder-number" class="block text-sm font-medium">Nomor map baru</label>
            <input id="folder-number" v-model.number="folderNumber" type="number" min="1" max="2147483647" step="1" required :class="inputClass" :disabled="creatingFolder || loadingFolders" />
            <button type="submit" :class="primaryClass" :disabled="creatingFolder || loadingFolders">{{ creatingFolder ? 'Membuat map...' : 'Buat Map & Lanjut Scan' }}</button>
          </form>
          <p v-if="folderError" role="alert" class="mt-4 text-sm text-red-700">{{ folderError }}</p>
          <button type="button" :class="secondaryClass" class="mt-4" :disabled="loadingFolders || creatingFolder" @click="loadFolders">Muat ulang map</button>
        </template>

        <template v-else-if="step === 'created' && selectedStorage">
          <p role="status" class="rounded-theme bg-teal-50 p-4 font-medium text-teal-800">Label berhasil dibuat.</p>
          <h2 class="mt-6 text-xl font-semibold">Label penyimpanan</h2>
          <div class="my-5 border-y border-stone-300 py-8">
            <p class="text-sm font-semibold text-muted">Berkas BAPP Fisik - {{ selectedStorage.vendor }}</p>
            <p class="mt-3 break-words text-2xl font-semibold">{{ selectedStorage.name }}</p>
            <p class="mt-2 font-mono text-xs text-muted">{{ storageCode(selectedStorage.id) }}</p>
            <p class="mt-8 text-xl font-semibold sm:text-2xl">Jumlah Dokumen __________</p>
            <p class="mt-3 text-xs text-muted">Dicetak pada {{ printedAt }}</p>
          </div>
          <p class="mb-5 text-sm text-muted">Isi jumlah dokumen dengan spidol pada ruang kosong setelah label dicetak.</p>
          <div class="flex flex-wrap gap-3"><button type="button" :class="primaryClass" @click="printLabel"><AppIcon name="printer" />Cetak Label</button><button type="button" :class="secondaryClass" @click="startScanning(selectedStorage)"><AppIcon name="scan" />Cetak Nanti, Lanjut Scan</button></div>
        </template>

        <template v-else-if="step === 'scan' && selectedStorage">
        <div class="mb-8 flex flex-wrap items-center justify-between gap-6 border-b border-stone-200 pb-6">
          <div class="min-w-0">
          <p class="text-xs font-medium text-sky-700">Penyimpanan terpilih</p>
          <p class="mt-1 break-words text-lg font-semibold">{{ selectedStorage.name }}</p>
          <p class="mt-2 text-lg font-semibold text-sky-700">Map {{ selectedFolder?.number }}</p>
          <button type="button" :class="secondaryClass" class="mt-3" :disabled="pendingScans.length > 0" @click="startScanning(selectedStorage)">Ganti Map</button>
          <p class="mt-1 text-sm text-muted">{{ selectedStorage.vendor }} · {{ selectedStorage.type }} · {{ storageCode(selectedStorage.id) }}</p>
          <div class="mt-4 flex flex-wrap gap-3"><button type="button" :disabled="pendingScans.length > 0" :class="secondaryClass" @click="chooseStorage"><AppIcon name="switch" />Ganti Penyimpanan</button><button type="button" :class="primaryClass" @click="printLabel"><AppIcon name="printer" />Cetak Label</button></div>
          </div>
          <div class="ml-auto text-right" aria-live="polite">
            <p data-testid="document-count" class="text-6xl font-bold tabular-nums tracking-tight text-sky-700 sm:text-7xl">{{ scanSummary?.documents ?? '—' }}</p>
            <p class="mt-2 text-sm font-semibold">Dokumen terscan di Map {{ selectedFolder?.number }}</p>
            <p class="mt-1 text-xs text-muted">{{ scanSummary?.totalScans ?? 0 }} scan tercatat · serial number unik</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-xl font-semibold">Scan serial number</h2>
          <span class="rounded-full px-3 py-1 text-xs font-medium" :class="focused ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'">
            {{ focused ? 'Input siap menerima scan' : 'Klik input untuk scan' }}
          </span>
        </div>
        <p id="barcode-help" class="mt-3 text-sm leading-6 text-muted">Scan serial number, lalu Enter atau klik Simpan Scan. Data langsung disimpan. {{ selectedStorage.vendor === 'Hisense' ? 'Pengecekan Hisense berjalan otomatis.' : `Pengecekan API ${selectedStorage.vendor} belum tersedia.` }} Anda bisa langsung scan dokumen berikutnya.</p>
        <form class="mt-6 space-y-4" @submit.prevent="receiveBarcode">
          <div>
            <label for="barcode" class="mb-2 block text-sm font-medium">Serial Number</label>
            <input id="barcode" ref="barcodeInput" v-model="barcode" type="text" name="barcode" autocomplete="off" autocapitalize="off" :spellcheck="false"
              aria-describedby="barcode-help barcode-note" :aria-invalid="!!errorMessage" placeholder="Scan serial number di sini…"
              class="w-full rounded-theme border border-stone-300 bg-white px-4 py-4 font-mono text-lg outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              @focus="focused = true" @blur="focused = false" @input="errorMessage = ''" />
            <p id="barcode-note" class="mt-2 text-xs text-muted">Scan duplikat tetap tercatat dengan badge peringatan, tanpa menambah jumlah dokumen unik. Duplikat diperiksa di seluruh penyimpanan.</p>
          </div>
          <p v-if="errorMessage" role="alert" class="text-sm text-red-700">{{ errorMessage }}</p>
          <div class="flex flex-wrap gap-3">
            <button type="submit" :class="primaryClass"><AppIcon name="save" />Simpan Scan</button>
            <button type="button" :class="secondaryClass" @click="focusScanner"><AppIcon name="scan" />Scan lagi</button>
          </div>
        </form>
        <div v-if="lastBarcode" role="status" class="mt-6 rounded-theme border border-teal-200 bg-teal-50 p-4">
          <p class="text-sm font-medium text-teal-800">Scan tersimpan ke database</p>
          <p class="mt-2 break-all font-mono text-lg text-teal-950">{{ lastBarcode }}</p>
        </div>
        <ul v-if="pendingScans.length" class="mt-5 space-y-2" aria-live="polite">
          <li v-for="entry in pendingScans" :key="entry.requestId" class="border-l-4 p-3 text-sm" :class="entry.error ? 'border-amber-500 bg-amber-50' : 'border-sky-400 bg-sky-50'">
            <strong class="break-all font-mono">{{ entry.barcode }}</strong> — {{ entry.saving ? 'Menyimpan…' : entry.error }}
            <button v-if="entry.error && !entry.saving" type="button" :class="secondaryClass" class="ml-3" @click="persistScan(entry)"><AppIcon name="refresh" />Coba simpan ulang</button>
          </li>
        </ul>
        <section class="mt-10 border-t border-stone-200 pt-6">
          <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-xl font-semibold">Dokumen Terscan</h2><button type="button" :class="secondaryClass" :disabled="loadingScans" @click="loadScans"><AppIcon name="refresh" :class="{ 'animate-spin': loadingScans }" />Muat Ulang</button></div>
          <p class="mt-2 text-xs text-muted">Data terbaru di atas. Status pengecekan dan tabel diperbarui otomatis. Waktu ditampilkan dalam WIB.</p><p class="mt-1 text-xs text-muted">Jumlah BAPP: serial number unik sekolah yang sudah terscan di seluruh penyimpanan Hisense / total serial number sekolah di Hisense. Duplikat dihitung sekali.</p>
          <p class="mt-2 text-xs text-muted">Scan pertama masuk Detail Serial Number. Scan ulang nomor yang sama, termasuk dari penyimpanan lain, masuk Data Duplikat.</p>
          <div role="tablist" aria-label="Data scan BAPP" class="mt-6 flex flex-wrap gap-2 border-b border-stone-200">
            <button v-for="tab in (['details', 'duplicates'] as const)" :id="'scan-tab-' + tab" :key="tab" type="button" role="tab" :aria-selected="scanTab === tab" :tabindex="scanTab === tab ? 0 : -1" aria-controls="scan-table-panel" class="border-b-2 px-4 py-3 text-sm font-semibold" :class="scanTab === tab ? 'border-sky-600 text-sky-700' : 'border-transparent text-stone-500 hover:text-stone-800'" @click="selectScanTab(tab)" @keydown.right.prevent="selectScanTab(tab === 'details' ? 'duplicates' : 'details', true)" @keydown.left.prevent="selectScanTab(tab === 'details' ? 'duplicates' : 'details', true)" @keydown.home.prevent="selectScanTab('details', true)" @keydown.end.prevent="selectScanTab('duplicates', true)">{{ tab === 'details' ? 'Detail Serial Number' : 'Data Duplikat' }} ({{ scanTabCounts[tab] }})</button>
          </div>
          <div id="scan-table-panel" role="tabpanel" :aria-labelledby="'scan-tab-' + scanTab">
          <p v-if="scanLoadError" role="alert" class="mt-4 text-sm text-red-700">{{ scanLoadError }}</p>
          <p v-if="!scans.length && loadingScans" role="status" class="py-8 text-sm text-muted">Memuat data scan…</p>
          <p v-else-if="!scans.length && !scanLoadError" class="py-8 text-sm text-muted">{{ scanTab === 'duplicates' ? 'Belum ada scan duplikat dalam penyimpanan ini.' : 'Belum ada serial number pertama dalam penyimpanan ini.' }}</p>
          <div v-if="scans.length" class="mt-5 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-y border-stone-200 bg-stone-50 text-xs text-muted"><tr><th scope="col" class="px-4 py-3">Waktu Scan</th><th scope="col" class="px-4 py-3">Serial Number</th><th scope="col" class="px-4 py-3">Sekolah / NPSN</th><th scope="col" class="px-4 py-3">Jumlah BAPP</th><th scope="col" class="px-4 py-3">Status {{ selectedStorage.vendor }}</th><th scope="col" class="px-4 py-3">Peringatan</th><th scope="col" class="px-4 py-3">Petugas</th></tr></thead>
              <tbody class="divide-y divide-stone-100">
                <tr v-for="scan in scans" :key="scan.id" :data-scan-id="scan.id" :class="scan.isDuplicate ? 'bg-amber-50/40' : ''">
                  <td class="whitespace-nowrap px-4 py-4 text-xs">{{ formatScanDate(scan.createdAt) }}</td>
                  <td class="max-w-xs break-all px-4 py-4 font-mono font-semibold">{{ scan.barcode }}</td>
                  <td class="min-w-[180px] px-4 py-4"><p>{{ scan.schoolName || '—' }}</p><p class="mt-1 text-xs text-muted">{{ scan.npsn || '' }}</p></td>
                  <td class="min-w-[150px] px-4 py-4" data-bapp-progress>
                    <template v-if="scan.schoolProgress?.status === 'ready'">
                      <span class="inline-flex rounded-full px-3 py-1 text-base font-bold tabular-nums" :class="scan.schoolProgress.scanned === scan.schoolProgress.total ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'" :title="`Serial number unik sekolah ini yang sudah terscan di seluruh penyimpanan Hisense / total serial number di Hisense. Diperbarui: ${scan.schoolProgress.checkedAt ? formatScanDate(scan.schoolProgress.checkedAt) : '—'}`">{{ scan.schoolProgress.scanned }}/{{ scan.schoolProgress.total }}</span>
                      <p class="mt-1 text-xs text-muted">{{ scan.schoolProgress.scanned === scan.schoolProgress.total ? 'Lengkap' : 'Belum lengkap' }}</p>
                    </template>
                    <template v-else-if="scan.schoolProgress?.status === 'error'"><p class="text-xs text-amber-800">Jumlah belum tersedia</p><button type="button" :disabled="recheckingSchools.includes(scan.id)" class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 underline disabled:opacity-50" @click="recheckSchool(scan)"><AppIcon name="refresh" class="h-4 w-4" />Cek jumlah BAPP</button></template>
                    <span v-else-if="scan.schoolProgress" class="text-xs text-sky-700">Menghitung BAPP…</span>
                    <span v-else class="text-muted">—</span>
                  </td>
                  <td class="min-w-[190px] px-4 py-4"><span class="inline-block rounded-full px-3 py-1 text-xs font-semibold" :class="statusClasses[scan.validationStatus]">{{ statusLabels[scan.validationStatus] }}</span><p v-if="scan.validationMessage" class="mt-2 max-w-xs text-xs text-muted">{{ scan.validationMessage }}</p><button v-if="scan.validationStatus === 'error' || scan.validationStatus === 'invalid'" type="button" :disabled="rechecking.includes(scan.id)" class="mt-2 text-xs font-semibold text-sky-700 underline disabled:opacity-50" @click="recheckScan(scan)"><AppIcon name="refresh" class="mr-1 h-4 w-4" />{{ rechecking.includes(scan.id) ? 'Menjadwalkan…' : 'Cek ulang' }}</button></td>
                  <td class="px-4 py-4"><span v-if="scan.isDuplicate" class="whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900" :title="`${scan.occurrences} scan nomor yang sama di seluruh penyimpanan`">⚠ Duplikat · {{ scan.occurrences }} scan</span><span v-else class="text-muted">—</span></td>
                  <td class="px-4 py-4">{{ scan.scannedBy || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="tabTotalRows > 50" class="mt-5 flex flex-wrap items-center justify-end gap-3 text-sm"><button type="button" :class="secondaryClass" :disabled="scanPage <= 1 || loadingScans" @click="scanPage--; loadScans()"><AppIcon name="arrow-left" />Sebelumnya</button><span>Halaman {{ scanPage }} / {{ Math.ceil(tabTotalRows / 50) }}</span><button type="button" :class="secondaryClass" :disabled="scanPage * 50 >= tabTotalRows || loadingScans" @click="scanPage++; loadScans()">Berikutnya<AppIcon name="arrow-right" /></button></div>
          </div>
        </section>
        </template>
      </section>
    </main>
  </AppShell>
  <Teleport to="body">
    <section v-if="selectedStorage" class="bapp-print-label" aria-hidden="true">
      <p class="bapp-print-type">Berkas BAPP Fisik - {{ selectedStorage.vendor }}</p>
      <h1>{{ selectedStorage.name }}</h1>
      <p class="bapp-print-code">{{ storageCode(selectedStorage.id) }}</p>
      <p class="bapp-print-count">Jumlah Dokumen __________</p>
      <p class="bapp-print-date">Dicetak pada {{ printedAt }}</p>
    </section>
  </Teleport>
</template>

<style>
.bapp-print-label { display: none; }
@media print {
  body:has(> .bapp-print-label) > * { display: none !important; }
  body > .bapp-print-label { display: block !important; color: #000; background: #fff; border: 2px solid #000; padding: 10mm; width: 160mm; max-width: 100%; box-sizing: border-box; break-inside: avoid; font-family: Arial, sans-serif; }
  .bapp-print-label h1 { font-size: 28pt; line-height: 1.2; margin: 8mm 0 4mm; overflow-wrap: anywhere; }
  .bapp-print-type { font-size: 12pt; }
  .bapp-print-code { font-size: 11pt; }
  .bapp-print-count { margin-top: 18mm; font-size: 20pt; }
  .bapp-print-date { margin-top: 4mm; font-size: 9pt; color: #555; }
}
</style>
