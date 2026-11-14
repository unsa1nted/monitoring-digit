<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { compilePhotoNotes, parsePhotoNotes } from '~/utils/photo-review-notes'
import { bappRejectionReasons } from '../../../shared/bapp-rejection-reasons'
useHead({ title: 'Cek BAPP | Dashboard Pemantauan Digitalisasi Pembelajaran SMK' })
type Transaction = {
  id_transaksi?: string
  kode_status_progress?: string | null
  approved_by_moe?: string | null
  approved_by_apip?: string | null
  rejected_by_moe?: string | null
  rejected_by_apip?: string | null
  serial_number?: string | null
  jumlah_pid?: number | null
  tag_revisi?: string | string[] | null
  riwayat_revisi_moe?: unknown[] | null
  riwayat_revisi_apip?: unknown[] | null
  npsn_info?: { npsn?: string; nama_sekolah?: string | null; propinsi?: string | null; kabupaten_kota?: string | null; kecamatan?: string | null; alamat?: string; qty?: number | null } | null
  foto_instalasi?: Record<string, string | null> | null
}
type Verdict = 'Ya' | 'Tidak'
type Review = {
  sudahAdaRevisi: 'Ya' | 'Tidak'
  statusProgress: string | null
  fotoPlangSekolah: Verdict | null
  fotoBoxPic: Verdict | null
  fotoKelengkapanUnit: Verdict | null
  fotoProsesInstalasi: Verdict | null
  fotoKesesuaianSerialNumber: Verdict | null
  fotoTrainingRumahPendidikan: Verdict | null
  fotoBapp1: Verdict | null
  fotoBapp2: Verdict | null
  hasilAkhirReviu: 'Sesuai' | 'Tidak Sesuai' | null
  catatanPetugas: string | null
}
type ReviewRow = { npsn: string; userPetugas: string; transaction: Transaction | null; review: Review | null }
type BappSummary = { perluDireviu: number; totalDisetujui: number; totalSesuaiApip: number; totalReviuApip: number; totalDitolakRevisi: number }
const config = useRuntimeConfig()
const page = ref(1)
const status = ref('')
const { data, pending, error, refresh } = await useFetch<{ data: ReviewRow[]; page: number; total: number; pageSize: number; statuses: Array<{ code: string; count: number }> }>('/api/bapp-review', {
  baseURL: config.public.apiBase,
  credentials: 'include',
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
  query: { page, status }
})
const { data: summaryData, pending: summaryPending, error: summaryError, refresh: refreshSummary } = await useFetch<{ summary: BappSummary }>('/api/bapp-dashboard', {
  baseURL: config.public.apiBase,
  credentials: 'include',
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
  query: { scope: 'mine' }
})
const statusOrder = ['INSTALASI SELESAI', 'DITOLAK_REVISI', 'DISETUJUI', 'REVIU APIP', 'SESUAI APIP']
const statusTabMeta = {
  'INSTALASI SELESAI': { label: 'Perlu Direviu', icon: 'clipboard-check', active: 'border-sky-700 bg-sky-700 text-white', idle: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100' },
  DITOLAK_REVISI: { label: 'Ditolak / Revisi', icon: 'circle-x', active: 'border-red-700 bg-red-700 text-white', idle: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100' },
  DISETUJUI: { label: 'Disetujui', icon: 'circle-check', active: 'border-emerald-700 bg-emerald-700 text-white', idle: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' },
  'REVIU APIP': { label: 'Reviu APIP', icon: 'clipboard-check', active: 'border-violet-700 bg-violet-700 text-white', idle: 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100' },
  'SESUAI APIP': { label: 'Sesuai APIP', icon: 'circle-check', active: 'border-teal-700 bg-teal-700 text-white', idle: 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100' }
} as const
const tabMeta = (code: string) => statusTabMeta[code as keyof typeof statusTabMeta]
const number = (value: number) => new Intl.NumberFormat('id-ID').format(value)
const statusTabs = computed(() => [...(data.value?.statuses ?? [])].sort((a, b) => {
  const first = statusOrder.indexOf(a.code)
  const second = statusOrder.indexOf(b.code)
  return (first < 0 ? statusOrder.length : first) - (second < 0 ? statusOrder.length : second) || a.code.localeCompare(b.code)
}))
function selectStatus(next: string) { status.value = next; page.value = 1 }
const lockedReviewStatuses = new Set(['DISETUJUI', 'SESUAI APIP', 'REVIU APIP'])
const progressStatusClasses: Record<string, string> = {
  'INSTALASI SELESAI': 'bg-sky-100 text-sky-800',
  REVISI: 'bg-red-100 text-red-800',
  DISETUJUI: 'bg-emerald-100 text-emerald-800',
  'REVIU APIP': 'bg-violet-100 text-violet-800',
  'SESUAI APIP': 'bg-teal-100 text-teal-800'
}
const tag = (item: Transaction | null) => Array.isArray(item?.tag_revisi) ? item.tag_revisi.join(', ') : item?.tag_revisi || '—'
const photo = (item: Transaction | null, key: string) => {
  const value = item?.foto_instalasi?.[key]
  if (!value) return null
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null }
  catch { return null }
}
const photoFields = [
  { key: 'foto_plang_sekolah', reviewKey: 'fotoPlangSekolah', label: 'Foto Plang Sekolah (1)', noteLabel: 'Plang' },
  { key: 'foto_box_pic', reviewKey: 'fotoBoxPic', label: 'Foto Box & PIC (2)', noteLabel: 'Box & PIC' },
  { key: 'foto_kelengkapan_unit', reviewKey: 'fotoKelengkapanUnit', label: 'Foto Kelengkapan Unit (3)', noteLabel: 'Kelengkapan Unit' },
  { key: 'foto_proses_instalasi', reviewKey: 'fotoProsesInstalasi', label: 'Foto Proses Instalasi (4)', noteLabel: 'Proses Instalasi' },
  { key: 'foto_sn', reviewKey: 'fotoKesesuaianSerialNumber', label: 'Foto Kesesuaian Serial Number (5)', noteLabel: 'Kesesuaian Serial Number' },
  { key: 'foto_training', reviewKey: 'fotoTrainingRumahPendidikan', label: 'Foto Training & Capture Rumah Pendidikan (6)', noteLabel: 'Training & Capture Rumah Pendidikan' },
  { key: 'foto_bapp_1', reviewKey: 'fotoBapp1', label: 'Foto BAPP 1 (7)', noteLabel: 'BAPP 1' },
  { key: 'foto_bapp_2', reviewKey: 'fotoBapp2', label: 'Foto BAPP 2 (8)', noteLabel: 'BAPP 2' }
] as const
const reviewing = ref<ReviewRow | null>(null)
const reviewModal = ref<HTMLDivElement | null>(null)
const confirmationModal = ref<HTMLDivElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const selectedSerial = ref('')
const detail = ref<Transaction | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const photoIndex = ref(0)
const photoViewer = ref<HTMLDivElement | null>(null)
const photoViewport = ref<HTMLDivElement | null>(null)
const photoZoom = ref(1)
const photoFullscreen = ref(false)
const imageLoading = ref(false)
const imageError = ref(false)
const prefetchedPhotos = new Map<string, HTMLImageElement>()
const currentPhoto = computed(() => photoFields[photoIndex.value])
const detailMatchesSerial = computed(() => Boolean(detail.value && detail.value.serial_number?.trim() === selectedSerial.value))
const hisenseReviewStatus = computed(() => {
  const item = detailMatchesSerial.value ? detail.value : null
  if (!item) return null
  if (item.kode_status_progress === 'SESUAI APIP' || item.kode_status_progress === 'DISETUJUI') return 'Sudah Disetujui'
  if (item.rejected_by_moe || item.rejected_by_apip || item.kode_status_progress === 'REVISI') return 'Sedang Ditolak'
  if (item.approved_by_moe || item.approved_by_apip) return 'Sudah Disetujui'
  return null
})
const currentPhotoUrl = computed(() => detailMatchesSerial.value ? photo(detail.value, currentPhoto.value.key) : null)
watch([photoIndex, selectedSerial, detail], () => {
  imageLoading.value = Boolean(currentPhotoUrl.value)
  imageError.value = false
  photoZoom.value = 1
}, { flush: 'sync' })
const reviewedCount = computed(() => photoFields.filter(field => reviewForm[field.reviewKey]).length)
const detailFields = computed(() => {
  const item = detail.value
  if (!item) return []
  return [
    ['ID Transaksi', item.id_transaksi], ['Serial Number', item.serial_number], ['Status Progress', item.kode_status_progress],
    ['NPSN', item.npsn_info?.npsn], ['Nama Sekolah', item.npsn_info?.nama_sekolah], ['Propinsi', item.npsn_info?.propinsi],
    ['Kabupaten/Kota', item.npsn_info?.kabupaten_kota], ['Kecamatan', item.npsn_info?.kecamatan], ['Alamat', item.npsn_info?.alamat],
    ['Jumlah PID', item.npsn_info?.qty ?? item.jumlah_pid]
  ] as Array<[string, string | number | null | undefined]>
})
const reviewForm = reactive({ fotoPlangSekolah: '' as Verdict | '', fotoBoxPic: '' as Verdict | '', fotoKelengkapanUnit: '' as Verdict | '', fotoProsesInstalasi: '' as Verdict | '', fotoKesesuaianSerialNumber: '' as Verdict | '', fotoTrainingRumahPendidikan: '' as Verdict | '', fotoBapp1: '' as Verdict | '', fotoBapp2: '' as Verdict | '' })
const photoNotes = reactive(Object.fromEntries(photoFields.map(field => [field.reviewKey, ''])) as Record<(typeof photoFields)[number]['reviewKey'], string>)
const legacyNote = ref('')
const photoNoteError = ref('')
const saving = ref(false)
const reviewError = ref('')
const reviewMessage = ref('')
const hasRejectedPhoto = computed(() => photoFields.some(field => reviewForm[field.reviewKey] === 'Tidak'))
const rejectedPhotoNotes = computed(() => compilePhotoNotes(photoNotes, photoFields.filter(field => reviewForm[field.reviewKey] === 'Tidak')))
const decision = ref<'approve' | 'reject' | null>(null)
const selectedReasons = ref<string[]>([])
const rejectionNote = ref('')
async function openReview(row: ReviewRow) {
  reviewing.value = row
  selectedSerial.value = row.transaction?.serial_number?.trim() ?? ''
  detail.value = null
  const id = row.transaction?.id_transaksi
  detailError.value = id ? '' : 'ID transaksi belum tersedia.'
  detailLoading.value = Boolean(id)
  photoIndex.value = 0
  for (const field of photoFields) reviewForm[field.reviewKey] = row.review?.[field.reviewKey] ?? ''
  const savedNotes = parsePhotoNotes(row.review?.catatanPetugas ?? '', photoFields)
  for (const field of photoFields) photoNotes[field.reviewKey] = savedNotes.notes[field.reviewKey] ?? ''
  legacyNote.value = savedNotes.legacy
  photoNoteError.value = ''
  reviewError.value = reviewMessage.value = ''
  decision.value = null
  selectedReasons.value = []
  rejectionNote.value = ''
  await nextTick()
  closeButton.value?.focus()
  if (!id) return
  try {
    const result = await $fetch<{ data: Transaction }>(`/api/bapp-review/${encodeURIComponent(id)}/detail`, { baseURL: config.public.apiBase, credentials: 'include', timeout: 90_000 })
    if (reviewing.value !== row) return
    const serial = result.data.serial_number?.trim() ?? ''
    if (selectedSerial.value && selectedSerial.value !== serial) { detailError.value = 'Serial Number Hisense berbeda dari master BAPP.'; return }
    selectedSerial.value = serial
    detail.value = result.data
    if (!serial) detailError.value = 'Serial Number belum tersedia di Hisense.'
  } catch (error: any) {
    if (reviewing.value === row) detailError.value = error?.data?.message ?? 'Detail Hisense belum dapat dimuat. Coba lagi.'
  } finally { if (reviewing.value === row) detailLoading.value = false }
}
function closeReview() {
  if (import.meta.client && document.fullscreenElement === photoViewer.value) void document.exitFullscreen()
  decision.value = null
  reviewing.value = null
  detail.value = null
  detailLoading.value = false
  selectedSerial.value = ''
  prefetchedPhotos.clear()
}
function selectPhoto(index: number) {
  if (index === photoIndex.value) return
  const field = currentPhoto.value
  if (reviewForm[field.reviewKey] === 'Tidak' && !photoNotes[field.reviewKey].trim()) {
    photoNoteError.value = `Isi catatan ${field.noteLabel} sebelum pindah foto.`
    return
  }
  photoNoteError.value = ''
  photoIndex.value = index
}
function onPhotoLoad() {
  imageLoading.value = false
  const next = photoFields[photoIndex.value + 1]
  if (next && detailMatchesSerial.value) {
    const url = photo(detail.value, next.key)
    if (url && !prefetchedPhotos.has(url)) { const image = new Image(); image.src = url; prefetchedPhotos.set(url, image) }
  }
}
function setPhotoZoom(next: number) {
  photoZoom.value = Math.max(1, Math.min(4, next))
  nextTick(() => {
    const viewport = photoViewport.value
    if (!viewport) return
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2
  })
}
async function togglePhotoFullscreen() {
  if (!photoViewer.value) return
  try {
    if (document.fullscreenElement === photoViewer.value) await document.exitFullscreen()
    else await photoViewer.value.requestFullscreen()
  } catch { reviewError.value = 'Layar penuh tidak tersedia di browser ini.' }
}
function onPhotoFullscreenChange() { photoFullscreen.value = document.fullscreenElement === photoViewer.value }
function onModalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); if (photoFullscreen.value) void document.exitFullscreen(); else if (decision.value) decision.value = null; else closeReview(); return }
  if (event.key !== 'Tab') return
  const focusable = (decision.value ? confirmationModal.value : photoFullscreen.value ? photoViewer.value : reviewModal.value)?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea, a[href]')
  if (!focusable?.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
watch(reviewing, (row, _, onCleanup) => {
  if (!row || !import.meta.client) return
  const previous = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  onCleanup(() => { document.body.style.overflow = previous })
})
function openDecision(action: 'approve' | 'reject') {
  const id = detailMatchesSerial.value ? detail.value?.id_transaksi : null
  if (!id || saving.value) return
  if (photoFields.some(field => !reviewForm[field.reviewKey])) { reviewError.value = 'Isi semua hasil reviu foto.'; return }
  const missingNote = photoFields.find(field => reviewForm[field.reviewKey] === 'Tidak' && !photoNotes[field.reviewKey].trim())
  if (missingNote) { photoIndex.value = photoFields.indexOf(missingNote); photoNoteError.value = `Isi catatan ${missingNote.noteLabel} sebelum menyimpan.`; return }
  if (action === 'approve' && photoFields.some(field => reviewForm[field.reviewKey] === 'Tidak')) { reviewError.value = 'Semua foto harus Sesuai untuk menyetujui BAPP.'; return }
  const catatanPetugas = compilePhotoNotes(photoNotes, photoFields.filter(field => reviewForm[field.reviewKey] === 'Tidak'), legacyNote.value)
  if (catatanPetugas.length > 5000) { reviewError.value = 'Gabungan catatan maksimal 5000 karakter.'; return }
  rejectionNote.value = action === 'reject' ? rejectedPhotoNotes.value : ''
  selectedReasons.value = []
  decision.value = action
  reviewError.value = ''
  nextTick(() => confirmationModal.value?.querySelector<HTMLElement>('button, input, textarea')?.focus())
}
async function saveReview() {
  const id = detailMatchesSerial.value ? detail.value?.id_transaksi : null
  if (!id || !decision.value || saving.value) return
  const rejectionText = hasRejectedPhoto.value ? rejectedPhotoNotes.value : rejectionNote.value.trim()
  if (decision.value === 'reject' && (!selectedReasons.value.length || !rejectionText)) { reviewError.value = 'Pilih alasan penolakan dan isi catatan penolakan.'; return }
  const action = decision.value
  const catatanPetugas = compilePhotoNotes(photoNotes, photoFields.filter(field => reviewForm[field.reviewKey] === 'Tidak'), legacyNote.value)
  saving.value = true
  reviewError.value = ''
  try {
    await $fetch(`/api/bapp-review/${encodeURIComponent(id)}`, { baseURL: config.public.apiBase, credentials: 'include', method: 'POST', body: { ...reviewForm, catatanPetugas, action, rejectionReasons: selectedReasons.value, rejectionNote: rejectionText } })
    await Promise.all([refresh(), refreshSummary()])
    closeReview()
    reviewMessage.value = `Transaksi ${id} ${action === 'approve' ? 'disetujui' : 'ditolak'} di Hisense.`
  } catch (error: any) { reviewError.value = error?.data?.message ?? 'Reviu gagal disimpan. Coba lagi.' }
  finally { saving.value = false }
}
</script>

<template>
  <AppShell>
    <header
      class="relative overflow-hidden border-b border-sky-950 bg-gradient-to-br from-slate-950 via-sky-950 to-teal-900 px-5 py-8 text-white sm:px-8 sm:py-10">
      <div class="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full border border-white/10"
        aria-hidden="true" />
      <div class="pointer-events-none absolute -right-8 -top-20 h-52 w-52 rounded-full border border-white/10"
        aria-hidden="true" />
      <div class="relative flex flex-wrap items-end justify-between gap-6">
        <div class="flex items-start gap-4">
          <span
            class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-teal-200">
            <AppIcon name="clipboard-check" class="h-6 w-6" />
          </span>
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200">Kertas Kerja</p>
            <h1 class="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Reviu BAPP Digitalisasi</h1>

          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">

          <button type="button" :disabled="pending || summaryPending"
            class="inline-flex items-center gap-2 rounded-theme border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
            @click="Promise.all([refresh(), refreshSummary()])">
            <AppIcon name="refresh" :class="{ 'animate-spin': pending || summaryPending }" />Muat ulang
          </button>
        </div>
      </div>
    </header>
    <section class="space-y-6 p-5 sm:p-8">
      <p v-if="error" role="alert" class="rounded-theme border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Data BAPP belum dapat dimuat. Coba muat ulang.</p>
      <p v-if="summaryError" role="alert"
        class="rounded-theme border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Ringkasan BAPP belum dapat
        dimuat.</p>
      <p v-if="reviewMessage" role="status"
        class="rounded-theme border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{{ reviewMessage }}</p>
      <div>
        <div class="mb-4 flex items-center gap-2"><span
            class="grid h-9 w-9 place-items-center rounded-theme bg-sky-100 text-sky-700">
            <AppIcon name="chart" />
          </span>
          <div>
            <h2 class="text-lg font-semibold">Ringkasan Reviu</h2>
            <p class="text-xs text-muted">Perkembangan seluruh transaksi BAPP</p>
          </div>
        </div>
        <BappSummaryCards :summary="summaryData?.summary ?? null" :loading="summaryPending" />
      </div>
      <div class="rounded-theme border border-stone-200 bg-white p-4 shadow-card sm:p-5">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <AppIcon name="list-filter" class="text-sky-700" />
            <h2 class="font-semibold">Filter status</h2>
          </div>
          <p class="text-xs text-muted">Hanya transaksi milik akun Internal Anda</p>
        </div>
        <div role="tablist" aria-label="Status progress BAPP" class="flex gap-2 overflow-x-auto pb-1">
          <button type="button" role="tab" :aria-selected="!status"
            :class="!status ? 'border-slate-900 bg-slate-900 text-white' : 'border-stone-200 bg-stone-50 text-ink hover:bg-stone-100'"
            class="inline-flex shrink-0 items-center gap-2 rounded-theme border px-3.5 py-2.5 text-sm font-medium"
            @click="selectStatus('')">
            <AppIcon name="clipboard-check" class="h-4 w-4" />Semua Data
          </button>
          <button v-for="tab in statusTabs" :key="tab.code" type="button" role="tab"
            :aria-selected="status === tab.code"
            :class="status === tab.code ? tabMeta(tab.code)?.active ?? 'border-slate-900 bg-slate-900 text-white' : tabMeta(tab.code)?.idle ?? 'border-stone-200 bg-stone-50 text-ink hover:bg-stone-100'"
            class="inline-flex shrink-0 items-center gap-2 rounded-theme border px-3.5 py-2.5 text-sm font-medium"
            @click="selectStatus(tab.code)">
            <AppIcon :name="tabMeta(tab.code)?.icon ?? 'clipboard-check'" class="h-4 w-4" />{{ tabMeta(tab.code)?.label
              ?? tab.code }}<span class="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">{{ number(tab.count) }}</span>
          </button>
        </div>
      </div>
      <div v-if="reviewing" ref="reviewModal" role="dialog" aria-modal="true" aria-labelledby="review-title"
        class="fixed inset-0 z-50 h-dvh w-screen bg-canvas text-ink" @keydown="onModalKeydown">
        <form class="flex h-full flex-col" @submit.prevent>
          <header
            class="flex items-center justify-between gap-4 border-b border-stone-200 bg-white px-5 py-3 shadow-sm">
            <div class="flex min-w-0 items-center gap-3"><span
                class="grid h-10 w-10 shrink-0 place-items-center rounded-theme bg-sky-100 text-sky-700">
                <AppIcon name="clipboard-check" />
              </span>
              <div class="min-w-0">
                <p class="text-[10px] font-semibold uppercase tracking-widest text-sky-700">Penilaian transaksi</p>
                <h2 id="review-title" class="truncate text-lg font-semibold">Reviu BAPP · {{
                  reviewing.transaction?.id_transaksi }}</h2>
                <p class="text-xs text-muted">Serial Number {{ selectedSerial || 'belum tersedia' }}</p>
              </div>
            </div>
            <button ref="closeButton" type="button"
              class="inline-flex items-center gap-2 rounded-theme border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
              aria-label="Tutup reviu" @click="closeReview">
              <AppIcon name="close" class="h-4 w-4" />Tutup
            </button>
          </header>
          <div
            class="grid min-h-0 flex-1 grid-rows-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)] lg:grid-rows-1">
            <section class="flex min-h-0 flex-col bg-white" aria-label="Foto reviu">
              <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-stone-950 p-4 text-white">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="inline-flex items-center gap-2 text-base font-semibold">
                    <AppIcon name="image" class="h-4 w-4 text-teal-300" />{{ currentPhoto.label }}
                  </h3><span class="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs text-stone-200">Foto {{
                    photoIndex + 1 }} / {{ photoFields.length }}</span>
                </div>
                <div class="shrink-0">
                  <div class="flex items-center justify-between gap-2 text-xs">
                    <h4 class="font-semibold">Hasil Reviu</h4><span class="text-stone-300">{{ reviewedCount }} dari {{
                      photoFields.length }} foto dinilai</span>
                  </div>
                  <div class="mt-2 h-1 overflow-hidden rounded-full bg-stone-700">
                    <div class="h-full rounded-full bg-teal-400 transition-all"
                      :style="{ width: `${reviewedCount / photoFields.length * 100}%` }" />
                  </div>
                  <div class="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4"><button
                      v-for="(field, index) in photoFields" :key="field.key" type="button"
                      :aria-label="`${field.label}: ${reviewForm[field.reviewKey] || 'Belum dinilai'}`"
                      :class="[reviewForm[field.reviewKey] === 'Ya' ? 'bg-teal-600 text-white' : reviewForm[field.reviewKey] === 'Tidak' ? 'bg-red-600 text-white' : 'bg-stone-700 text-stone-100', photoIndex === index ? 'ring-2 ring-white' : '']"
                      class="flex min-w-0 items-start gap-1.5 rounded-theme px-2 py-2 text-left text-[11px] font-medium leading-tight"
                      @click.stop.prevent="selectPhoto(index)"><span class="min-w-0 flex-1">{{ field.label
                      }}</span><span class="shrink-0">{{ reviewForm[field.reviewKey] === 'Ya' ? '✓' :
                          reviewForm[field.reviewKey] === 'Tidak' ? '✕' : '—' }}</span></button></div>
                </div>
                <div ref="photoViewer" class="relative min-h-0 flex-1 overflow-hidden rounded-theme bg-stone-900"
                  @fullscreenchange="onPhotoFullscreenChange">
                  <div ref="photoViewport" class="h-full w-full overflow-auto">
                    <img v-if="currentPhotoUrl && !imageError" :key="`${selectedSerial}:${currentPhoto.key}`"
                      :src="currentPhotoUrl" :alt="`${currentPhoto.label} · ${selectedSerial}`"
                      :style="{ width: `${photoZoom * 100}%`, height: `${photoZoom * 100}%` }"
                      class="block max-w-none object-contain" :class="imageLoading ? 'opacity-0' : 'opacity-100'"
                      @load="onPhotoLoad" @error="imageLoading = false; imageError = true">
                  </div>
                  <div
                    class="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-theme bg-stone-950/80 p-1 text-xs text-white">
                    <button type="button" aria-label="Perkecil foto"
                      :disabled="!currentPhotoUrl || imageError || photoZoom <= 1"
                      class="rounded p-1.5 hover:bg-white/15 disabled:opacity-40"
                      @click="setPhotoZoom(photoZoom - 0.5)">
                      <AppIcon name="zoom-out" class="h-4 w-4" />
                    </button>
                    <span class="min-w-10 text-center">{{ Math.round(photoZoom * 100) }}%</span>
                    <button type="button" aria-label="Perbesar foto"
                      :disabled="!currentPhotoUrl || imageError || photoZoom >= 4"
                      class="rounded p-1.5 hover:bg-white/15 disabled:opacity-40"
                      @click="setPhotoZoom(photoZoom + 0.5)">
                      <AppIcon name="zoom-in" class="h-4 w-4" />
                    </button>
                    <button type="button" :disabled="!currentPhotoUrl || imageError"
                      class="inline-flex items-center gap-1.5 rounded px-2 py-1.5 hover:bg-white/15 disabled:opacity-40"
                      @click="togglePhotoFullscreen">
                      <AppIcon :name="photoFullscreen ? 'minimize' : 'maximize'" class="h-4 w-4" />{{ photoFullscreen ?
                        'Keluar' : 'Layar penuh' }}
                    </button>
                  </div>
                  <p v-if="detailLoading" role="status"
                    class="pointer-events-none absolute inset-0 grid place-items-center text-sm text-stone-300">Sedang
                    memuat foto dari Hisense…</p>
                  <p v-else-if="imageLoading" role="status"
                    class="pointer-events-none absolute inset-0 grid place-items-center text-sm text-stone-300">Sedang
                    proses foto…</p>
                  <p v-else-if="!currentPhotoUrl || imageError"
                    class="pointer-events-none absolute inset-0 grid place-items-center text-sm text-stone-300">Foto
                    belum tersedia.</p>
                </div>
              </div>
              <div class="shrink-0 space-y-3 border-t border-stone-200 bg-white p-4 text-ink">
                <div class="flex flex-wrap items-center justify-center gap-3">
                  <button type="button" :disabled="!detailMatchesSerial"
                    :aria-pressed="reviewForm[currentPhoto.reviewKey] === 'Ya'"
                    :class="reviewForm[currentPhoto.reviewKey] === 'Ya' ? 'border-teal-700 bg-teal-700 text-white' : 'border-teal-700 bg-white text-teal-700 hover:bg-teal-50'"
                    class="inline-flex items-center gap-2 rounded-theme border px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                    @click="reviewForm[currentPhoto.reviewKey] = 'Ya'; photoNoteError = ''">
                    <AppIcon name="circle-check" class="h-4 w-4" />Sesuai
                  </button>
                  <button type="button" :disabled="!detailMatchesSerial"
                    :aria-pressed="reviewForm[currentPhoto.reviewKey] === 'Tidak'"
                    :class="reviewForm[currentPhoto.reviewKey] === 'Tidak' ? 'border-red-700 bg-red-700 text-white' : 'border-red-700 bg-white text-red-700 hover:bg-red-50'"
                    class="inline-flex items-center gap-2 rounded-theme border px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                    @click="reviewForm[currentPhoto.reviewKey] = 'Tidak'">
                    <AppIcon name="circle-x" class="h-4 w-4" />Tidak Sesuai
                  </button>
                </div>
                <div v-if="reviewForm[currentPhoto.reviewKey] === 'Tidak'" class="space-y-1"><label for="catatan-foto"
                    class="block text-sm font-medium">Catatan {{ currentPhoto.noteLabel }} <span
                      class="text-red-700">*</span></label><input id="catatan-foto"
                    v-model="photoNotes[currentPhoto.reviewKey]" type="text" maxlength="500"
                    :aria-invalid="Boolean(photoNoteError)"
                    class="w-full rounded-theme border border-stone-300 bg-white px-3 py-2 text-sm"
                    placeholder="Jelaskan alasan tidak sesuai" @input="photoNoteError = ''">
                  <p v-if="photoNoteError" role="alert" class="text-xs text-red-700">{{ photoNoteError }}</p>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <button type="button" :disabled="photoIndex === 0"
                    class="inline-flex items-center gap-1.5 rounded-theme border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-medium text-ink hover:bg-stone-200 disabled:opacity-40"
                    @click.stop.prevent="selectPhoto(photoIndex - 1)">
                    <AppIcon name="chevron-left" class="h-4 w-4" />Foto Sebelumnya
                  </button>
                  <button type="button" :disabled="photoIndex === photoFields.length - 1"
                    class="inline-flex items-center gap-1.5 rounded-theme border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-medium text-ink hover:bg-stone-200 disabled:opacity-40"
                    @click.stop.prevent="selectPhoto(photoIndex + 1)">Foto Selanjutnya
                    <AppIcon name="chevron-right" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
            <aside class="min-h-0 overflow-y-auto bg-white p-5" aria-label="Detail data Hisense">
              <h3 class="inline-flex items-center gap-2 text-lg font-semibold">
                <AppIcon name="school" class="text-sky-700" />Detail Data Hisense
              </h3>
              <p class="mt-1 text-xs text-muted">Data berdasarkan Serial Number {{ selectedSerial || '—' }}.</p>
              <span v-if="hisenseReviewStatus"
                :class="hisenseReviewStatus === 'Sudah Disetujui' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'"
                class="mt-3 inline-flex rounded-theme px-3 py-1 text-xs font-semibold">{{ hisenseReviewStatus }}</span>
              <p v-if="detailLoading" role="status" class="mt-5 text-sm text-muted">Sedang memuat detail Hisense…</p>
              <p v-if="detailError" role="alert" class="mt-5 text-sm text-red-700">{{ detailError }}</p>
              <dl v-if="detailMatchesSerial" class="mt-5 divide-y divide-stone-100 text-sm">
                <div v-for="[label, value] in detailFields" :key="label" class="grid grid-cols-[120px_1fr] gap-3 py-2">
                  <dt class="text-muted">{{ label }}</dt>
                  <dd class="min-w-0 break-words font-medium">{{ value ?? '—' }}</dd>
                </div>
              </dl>
              <p v-if="reviewError" role="alert" class="mt-3 text-sm text-red-700">{{ reviewError }}</p>
              <div class="mt-4 grid grid-cols-2 gap-3">
                <button type="button" :disabled="saving || !detailMatchesSerial"
                  class="inline-flex items-center justify-center gap-2 rounded-theme bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
                  @click="openDecision('approve')">
                  <AppIcon name="circle-check" class="h-4 w-4" />Disetujui
                </button>
                <button type="button" :disabled="saving || !detailMatchesSerial"
                  class="inline-flex items-center justify-center gap-2 rounded-theme bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-800 disabled:opacity-50"
                  @click="openDecision('reject')">
                  <AppIcon name="circle-x" class="h-4 w-4" />Ditolak
                </button>
              </div>
            </aside>
          </div>
        </form>
        <div v-if="decision" ref="confirmationModal" role="alertdialog" aria-modal="true"
          aria-labelledby="decision-title"
          class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div class="w-full max-w-xl space-y-4 rounded-theme bg-white p-5 shadow-xl">
            <h3 id="decision-title" class="flex items-center gap-2 text-lg font-semibold">
              <AppIcon :name="decision === 'approve' ? 'circle-check' : 'circle-x'"
                :class="decision === 'approve' ? 'text-teal-700' : 'text-red-700'" />{{ decision === 'approve' ?
                  'Setujui BAPP?' : 'Tolak BAPP?' }}
            </h3>
            <p v-if="decision === 'approve'" class="text-sm text-muted">Status transaksi akan menjadi DISETUJUI di Hisense. Lanjutkan?</p>
<p v-else class="text-sm text-muted">Pilih satu atau lebih alasan penolakan. Status transaksi akan menjadi REVISI di Hisense.</p>
            <template v-if="decision === 'reject'">
              <fieldset class="max-h-56 space-y-2 overflow-y-auto rounded-theme border border-stone-200 p-3">
                <legend class="px-1 text-sm font-semibold">Alasan penolakan</legend>
                <label v-for="reason in bappRejectionReasons" :key="reason"
                  class="flex items-start gap-2 text-sm"><input v-model="selectedReasons" type="checkbox"
                    :value="reason" class="mt-1 accent-red-700"><span>{{ reason }}</span></label>
              </fieldset>
              <label for="rejection-note" class="block text-sm font-semibold">Catatan penolakan<span v-if="hasRejectedPhoto"> dari foto Tidak Sesuai</span></label>
              <textarea id="rejection-note" v-model="rejectionNote" :readonly="hasRejectedPhoto"
                :class="hasRejectedPhoto ? 'bg-stone-50' : 'bg-white'" maxlength="5000" rows="4"
                class="w-full rounded-theme border border-stone-300 p-3 text-sm"
                placeholder="Jelaskan alasan penolakan" />
              <p v-if="hasRejectedPhoto" class="text-xs text-muted">Catatan diambil otomatis dari setiap foto yang
                dinilai Tidak Sesuai. Ubah catatan pada foto untuk mengubah teks ini.</p>
            </template>
            <p v-if="reviewError" role="alert" class="text-sm text-red-700">{{ reviewError }}</p>
            <div class="flex justify-end gap-3"><button type="button" :disabled="saving"
                class="rounded-theme border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
                @click="decision = null">Batal</button><button type="button" :disabled="saving"
                :class="decision === 'approve' ? 'bg-teal-700 hover:bg-teal-800' : 'bg-red-700 hover:bg-red-800'"
                class="inline-flex items-center gap-2 rounded-theme px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                @click="saveReview">
                <AppIcon :name="saving ? 'loading' : decision === 'approve' ? 'circle-check' : 'circle-x'"
                  :class="{ 'animate-spin': saving }" class="h-4 w-4" />{{ saving ? 'Mengirim…' : decision === 'approve'
                    ?
                    'Lanjutkan setujui' : 'Lanjutkan tolak' }}
              </button></div>
          </div>
        </div>
      </div>
      <div class="overflow-hidden rounded-theme border border-stone-200 bg-white shadow-card">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-4 sm:px-5">
          <div class="flex items-center gap-3"><span
              class="grid h-10 w-10 place-items-center rounded-theme bg-teal-50 text-teal-700">
              <AppIcon name="clipboard-check" />
            </span>
            <div>
              <h2 class="font-semibold">Daftar Transaksi</h2>
              <p class="text-xs text-muted">Geser tabel untuk melihat hasil tiap foto dan catatan</p>
            </div>
          </div><span class="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">{{
            number(data?.total ??
              0) }} transaksi</span>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-max w-full text-left text-sm">
            <caption class="sr-only">Daftar reviu BAPP</caption>
            <thead
              class="border-b border-stone-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr class="whitespace-nowrap [&_th]:px-4 [&_th]:py-4">
                <th scope="col">No</th>
                <th scope="col">ID Transaksi</th>
                <th scope="col">Sudah Ada Revisi</th>
                <th scope="col">Status Progress</th>
                <th scope="col">NPSN</th>
                <th scope="col">Nama Sekolah</th>
                <th scope="col">Propinsi</th>
                <th scope="col">Kabupaten/Kota</th>
                <th scope="col">Kecamatan</th>
                <th scope="col">Serial Number</th>
                <th scope="col">Tag</th>
                <th scope="col">Petugas Reviu</th>
                <th scope="col">Foto Plang Sekolah<br>(1)</th>
                <th scope="col">Foto Box &amp; PIC<br>(2)</th>
                <th scope="col">Foto Kelengkapan Unit<br>(3)</th>
                <th scope="col">Foto Proses Instalasi<br>(4)</th>
                <th scope="col">Foto Kesesuaian Serial Number<br>(5)</th>
                <th scope="col">Foto Training &amp;<br>Capture Rumah Pendidikan<br>(6)</th>
                <th scope="col">Foto BAPP 1<br>(7)</th>
                <th scope="col">Foto BAPP 2<br>(8)</th>
                <th scope="col">Hasil Akhir Reviu</th>
                <th scope="col">Catatan Petugas</th>
                <th scope="col" class="sticky right-0 border-l border-stone-200 bg-stone-50 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in data?.data ?? []"
                :key="`${row.npsn}-${row.transaction?.id_transaksi ?? index}`"
                class="group border-b border-stone-100 transition-colors hover:bg-sky-50/60 [&_td]:px-4 [&_td]:py-3.5">
                <td>{{ (page - 1) * (data?.pageSize ?? 15) + index + 1 }}</td>
                <td class="font-semibold text-slate-800">{{ row.transaction?.id_transaksi ?? '—' }}</td>
                <td><span v-if="row.review?.sudahAdaRevisi === 'Ya'"
                    class="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">Revisi
                    Tersedia</span><span v-else-if="row.review?.sudahAdaRevisi === 'Tidak'"
                    class="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">Tidak</span><span
                    v-else class="text-muted">—</span></td>
                <td><span v-if="row.review?.statusProgress ?? row.transaction?.kode_status_progress"
                    :class="progressStatusClasses[row.review?.statusProgress ?? row.transaction?.kode_status_progress ?? ''] ?? 'bg-stone-100 text-stone-700'"
                    class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold">{{
                      row.review?.statusProgress ?? row.transaction?.kode_status_progress }}</span><span v-else
                    class="text-muted">—</span></td>
                <td>{{ row.npsn }}</td>
                <td class="max-w-[260px] font-medium text-slate-800"><span class="block truncate"
                    :title="row.transaction?.npsn_info?.nama_sekolah ?? ''">{{ row.transaction?.npsn_info?.nama_sekolah
                      ?? '—'
                    }}</span></td>
                <td>{{ row.transaction?.npsn_info?.propinsi ?? '—' }}</td>
                <td>{{ row.transaction?.npsn_info?.kabupaten_kota ?? '—' }}</td>
                <td>{{ row.transaction?.npsn_info?.kecamatan ?? '—' }}</td>
                <td>{{ row.transaction?.serial_number ?? '—' }}</td>
                <td>{{ tag(row.transaction) }}</td>
                <td>{{ row.userPetugas }}</td>
                <td v-for="field in photoFields" :key="field.key"><span v-if="row.review?.[field.reviewKey] === 'Ya'"
                    class="font-semibold text-teal-700">✓ Sesuai</span><span
                    v-else-if="row.review?.[field.reviewKey] === 'Tidak'" class="font-semibold text-red-700">✕ Tidak
                    Sesuai</span><span v-else class="text-muted">—</span></td>
                <td><span v-if="row.review?.hasilAkhirReviu === 'Sesuai'" class="font-semibold text-teal-700">✓
                    Sesuai</span><span v-else-if="row.review?.hasilAkhirReviu === 'Tidak Sesuai'"
                    class="font-semibold text-red-700">✕ Tidak Sesuai</span><span v-else class="text-muted">—</span>
                </td>
                <td class="max-w-[260px]"><span class="block truncate" :title="row.review?.catatanPetugas ?? ''">{{
                  row.review?.catatanPetugas || '—' }}</span></td>
                <td class="sticky right-0 border-l border-stone-200 bg-white text-right group-hover:bg-sky-50"><button
                    v-if="row.transaction?.id_transaksi && !lockedReviewStatuses.has(row.review?.statusProgress ?? '') && !lockedReviewStatuses.has(row.transaction.kode_status_progress ?? '')"
                    type="button"
                    class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-theme bg-sky-700 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-800"
                    @click="openReview(row)">
                    <AppIcon :name="row.review?.hasilAkhirReviu ? 'image' : 'arrow-right'" class="h-4 w-4" />{{
                      row.review?.hasilAkhirReviu ? 'Ubah Reviu' : 'Mulai Reviu' }}
                  </button><span v-else>—</span></td>
              </tr>
              <tr v-if="!pending && !error && !data?.data?.length">
                <td colspan="23" class="px-4 py-12 text-center text-muted"><template v-if="status === 'DITOLAK_REVISI'">Tidak ada transaksi Ditolak / Sedang Revisi.</template><template v-else-if="status">Tidak ada transaksi dengan status {{ status }}.</template><template v-else>Belum ada transaksi untuk petugas Anda.</template></td>
              </tr>
              <tr v-if="pending">
                <td colspan="23" class="px-4 py-12 text-center text-muted">Memuat data BAPP…</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="data?.total"
          class="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 px-4 py-3 text-sm sm:px-5">
          <span class="text-muted">Halaman {{ page }} dari {{ Math.ceil(data.total / data.pageSize) }}</span>
          <div class="flex gap-2"><button type="button" :disabled="page <= 1 || pending"
              class="inline-flex items-center gap-1.5 rounded-theme border border-stone-300 bg-white px-3 py-2 font-medium hover:bg-stone-50 disabled:opacity-50"
              @click="page--">
              <AppIcon name="chevron-left" class="h-4 w-4" />Sebelumnya
            </button><button type="button" :disabled="page * data.pageSize >= data.total || pending"
              class="inline-flex items-center gap-1.5 rounded-theme border border-stone-300 bg-white px-3 py-2 font-medium hover:bg-stone-50 disabled:opacity-50"
              @click="page++">Berikutnya
              <AppIcon name="chevron-right" class="h-4 w-4" />
            </button></div>
        </div>
      </div>
    </section>
  </AppShell>
</template>
