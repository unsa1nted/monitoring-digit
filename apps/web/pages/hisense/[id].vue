<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
type ShippingRecord = {
  nomor_resi?: string | null
  ekspedisi?: string | null
  status_pengiriman?: string | null
  waktu_tiba?: string | null
  waktu_kirim?: string | null
  tanggal_kirim?: string | null
  nama_penerima?: string | null
  hubungan_penerima?: string | null
  riwayat_checkpoint?: Array<{ waktu?: string | null; status?: string | null; lokasi?: string | null; keterangan?: string | null }> | null
  [key: string]: unknown
}

type RevisionItem = Record<string, unknown>

type Transaction = {
  id_transaksi?: string
  kode_direktorat?: string
  nama_batch?: string | null
  nama_termin?: string | null
  serial_number?: string | null
  kode_status_progress?: string | null
  public_bapp_url?: string | null
  jumlah_pid?: number
  npsn_info?: { npsn?: string; nama_sekolah?: string; propinsi?: string; kabupaten_kota?: string; kecamatan?: string; qty?: number | null; nama_pic?: string | null; no_telepon?: string | null; nama_kepsek?: string | null; no_telepon_kepsek?: string | null } | null
  data_pengiriman?: ShippingRecord[] | null
  foto_instalasi?: Record<string, string | null> | null
  riwayat_revisi_moe?: RevisionItem[] | null
  riwayat_revisi_apip?: RevisionItem[] | null
}

type DetailResponse = { success: boolean; data?: Transaction; related_data?: Transaction[]; message?: string }

useHead({ title: 'Detail Pengiriman | Dashboard Pemantauan Digitalisasi Pembelajaran SMK' })
const config = useRuntimeConfig()
const authUser = useState<{ id: number; role: 'Admin' | 'Dinas'; province: string | null } | null>('auth-user')
const route = useRoute()
const transactionId = computed(() => String(route.params.id ?? ''))
const syncVersion = ref(0)
const refreshing = ref(false)
const { data, pending, error, refresh } = await useFetch<DetailResponse>(() => `/api/hisense/transactions/${encodeURIComponent(transactionId.value)}?refresh=${syncVersion.value ? '1' : '0'}`, {
  key: `hisense-detail:${authUser.value?.id}:${authUser.value?.role}:${authUser.value?.province}:${transactionId.value}`,
  baseURL: config.public.apiBase,
  credentials: 'include',
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
  watch: false,
  immediate: false
})
const syncLatest = async () => {
  refreshing.value = true
  syncVersion.value += 1
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

const transaction = computed(() => data.value?.data)
const relatedTransactions = computed(() => data.value?.related_data?.length ? data.value.related_data : (transaction.value ? [transaction.value] : []))
const shippingRecords = computed(() => transaction.value?.data_pengiriman ?? [])
const pidCount = computed(() => transaction.value?.npsn_info?.qty ?? transaction.value?.jumlah_pid ?? 0)
const selectedPhoto = ref<{ label: string; url: string } | null>(null)
const installationPhotos = computed(() => relatedTransactions.value.flatMap((item) => Object.entries(item.foto_instalasi ?? {})
  .filter(([, url]): url is string => typeof url === 'string' && url.length > 0)
  .map(([key, url]) => ({ label: `${item.id_transaksi || 'Transaksi'} · ${key.replace(/^foto_/, '').replace(/_/g, ' ')}`, url }))))
const revisionFields = (item: RevisionItem) => Object.entries(item)
  .filter(([, value]) => value !== null && value !== undefined && value !== '')
  .map(([key, value]) => ({ label: key.replace(/_/g, ' '), value: typeof value === 'object' ? JSON.stringify(value) : String(value) }))
const timelineEvents = computed(() => shippingRecords.value.flatMap((record) => {
  const checkpoints = record.riwayat_checkpoint ?? []
  if (!checkpoints.length) return [{ ...record, waktu: recordDate(record), status: record.status_pengiriman, lokasi: null, keterangan: null, nomor_resi: record.nomor_resi, ekspedisi: record.ekspedisi }]
  return checkpoints.map((checkpoint) => ({ ...checkpoint, nomor_resi: record.nomor_resi, ekspedisi: record.ekspedisi }))
}))
const formatDate = (value?: string | null) => {
  if (!value) return 'Waktu belum tersedia'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
const statusClass = (value?: string | null) => value === 'TERKIRIM' || value === 'DELIVERED' || value === 'BARANG TIBA' ? 'bg-teal-50 text-teal-700' : value?.includes('GAGAL') ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-700'
const recordDate = (record: ShippingRecord) => record.waktu_tiba || record.waktu_kirim || record.tanggal_kirim
</script>

<template>
  <AppShell>
    <header class="border-b border-stone-200 bg-white">
      <div class="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <div>
          <NuxtLink to="/hisense" class="text-sm font-semibold text-sky-600"><AppIcon name="arrow-left" /> Kembali ke data Hisense</NuxtLink>
          <h1 class="mt-3 text-2xl font-semibold tracking-tight">Detail pengiriman</h1>
          <p class="mt-1 text-sm text-muted">Timeline perjalanan pengiriman berdasarkan data Hisense.</p>
        </div>
        <button
          class="rounded-theme border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="refreshing || pending" @click="syncLatest"><AppIcon name="refresh" class="mr-2 h-4 w-4" :class="{ 'animate-spin': refreshing || pending }" />{{ refreshing ? 'Mengambil data…' : data ? 'Sinkron Data' : 'Muat detail'
          }}</button>
      </div>
    </header>

    <main class="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
      <div v-if="pending" class="rounded-theme border border-stone-200 bg-white p-6 shadow-card">
        <div class="animate-pulse space-y-6">
          <div class="flex items-start justify-between gap-6">
            <div class="w-2/3 space-y-3">
              <div class="h-3 w-32 rounded bg-stone-200" />
              <div class="h-8 w-3/4 rounded bg-stone-200" />
              <div class="h-4 w-1/2 rounded bg-stone-100" />
            </div>
            <div class="h-8 w-28 rounded-full bg-stone-100" />
          </div>
          <div class="grid gap-4 border-t border-stone-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div v-for="item in 4" :key="item" class="space-y-2">
              <div class="h-3 w-20 rounded bg-stone-100" />
              <div class="h-5 w-28 rounded bg-stone-200" />
            </div>
          </div>
          <div class="space-y-4 border-t border-stone-100 pt-6">
            <div class="h-5 w-48 rounded bg-stone-200" />
            <div v-for="item in 4" :key="item" class="ml-4 h-14 rounded bg-stone-100" />
          </div>
        </div>
      </div>
      <div v-else-if="error || data?.success === false" class="rounded-theme bg-red-50 p-6 text-sm text-red-700">{{
        data?.message || 'Detail pengiriman belum dapat diambil.' }}</div>
      <p v-else-if="!data" class="rounded-theme border border-stone-200 bg-white p-6 text-sm text-muted shadow-card">Klik Muat detail untuk mengambil data transaksi dari Hisense.</p>
      <template v-else-if="transaction">
        <section class="rounded-theme border border-stone-200 bg-white p-6 shadow-card sm:p-8">
          <div class="flex flex-col justify-between gap-4 border-b border-stone-100 pb-6 sm:flex-row sm:items-start">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[.16em] text-sky-600">Transaksi {{
                transaction.id_transaksi }}</p>
              <h2 class="mt-2 text-2xl font-semibold">{{ transaction.npsn_info?.nama_sekolah || 'Nama sekolah tidak tersedia' }}</h2>
              <p class="mt-1 text-sm text-muted">{{ transaction.npsn_info?.npsn || 'NPSN —' }} · {{
                transaction.npsn_info?.kabupaten_kota || 'Lokasi belum tersedia' }}</p>
            </div>
            <span class="w-fit rounded-full px-3 py-1.5 text-xs font-semibold"
              :class="statusClass(transaction.kode_status_progress)">{{ transaction.kode_status_progress || 'Belum ada status' }}</span>
          </div>
          <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p class="text-xs text-muted">Nomor resi</p>
              <p class="mt-1 font-mono text-sm">{{ shippingRecords[0]?.nomor_resi || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted">Ekspedisi</p>
              <p class="mt-1 text-sm">{{ shippingRecords[0]?.ekspedisi || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted">Batch / Termin</p>
              <p class="mt-1 text-sm">{{ transaction.nama_batch || '—' }} / {{ transaction.nama_termin || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted">Unit PID</p>
              <p class="mt-1 text-sm">{{ pidCount }} unit</p>
            </div>
          </div>
        </section>

        <section class="mt-6 rounded-theme border border-stone-200 bg-white p-6 shadow-card sm:p-8">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">Transaksi sekolah</h2>
              <p class="mt-1 text-sm text-muted">Seluruh transaksi untuk NPSN {{ transaction.npsn_info?.npsn || '—' }}.
              </p>
            </div><span class="text-xs text-muted">{{ relatedTransactions.length }} transaksi</span>
          </div>
          <div class="mt-6 grid gap-4 lg:grid-cols-2">
            <article v-for="item in relatedTransactions" :key="item.id_transaksi"
              class="rounded-theme border border-stone-100 bg-stone-50 p-5">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-muted">ID transaksi</p>
                  <p class="mt-1 font-mono text-sm font-semibold">{{ item.id_transaksi || '—' }}</p>
                </div><span class="rounded-full px-3 py-1 text-xs font-semibold"
                  :class="statusClass(item.kode_status_progress)">{{ item.kode_status_progress || 'Belum ada status'
                  }}</span>
              </div>
              <dl class="mt-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt class="text-xs text-muted">Serial number</dt>
                  <dd class="mt-1 break-all font-mono text-xs">{{ item.serial_number || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted">Batch / Termin</dt>
                  <dd class="mt-1 text-sm">{{ item.nama_batch || '—' }} / {{ item.nama_termin || '—' }}</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <section class="mt-6 grid gap-6 lg:grid-cols-2">
          <article class="rounded-theme border border-stone-200 bg-white p-6 shadow-card sm:p-8">
            <h2 class="text-lg font-semibold">PIC Sekolah</h2>
            <p class="mt-1 text-sm text-muted">Kontak penanggung jawab di sekolah.</p>
            <dl class="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs text-muted">Nama PIC</dt>
                <dd class="mt-1 text-sm font-medium">{{ transaction.npsn_info?.nama_pic || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">Telepon PIC</dt>
                <dd class="mt-1 text-sm font-medium">{{ transaction.npsn_info?.no_telepon || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">Nama Kepala Sekolah</dt>
                <dd class="mt-1 text-sm font-medium">{{ transaction.npsn_info?.nama_kepsek || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">Telepon Kepala Sekolah</dt>
                <dd class="mt-1 text-sm font-medium">{{ transaction.npsn_info?.no_telepon_kepsek || '—' }}</dd>
              </div>
            </dl>
          </article>
          <article class="rounded-theme border border-stone-200 bg-white p-6 shadow-card sm:p-8">
            <h2 class="text-lg font-semibold">Penerima</h2>
            <p class="mt-1 text-sm text-muted">Informasi penerimaan barang di sekolah.</p>
            <dl class="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs text-muted">Nama penerima</dt>
                <dd class="mt-1 text-sm font-medium">{{ shippingRecords[0]?.nama_penerima || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted">Hubungan penerima</dt>
                <dd class="mt-1 text-sm font-medium">{{ shippingRecords[0]?.hubungan_penerima || '—' }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs text-muted">Waktu tiba</dt>
                <dd class="mt-1 text-sm font-medium">{{ formatDate(shippingRecords[0]?.waktu_tiba) }}</dd>
              </div>
            </dl>
          </article>
        </section>

        <section class="mt-6 rounded-theme border border-stone-200 bg-white p-6 shadow-card sm:p-8">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold">Timeline pengiriman</h2>
              <p class="mt-1 text-sm text-muted">Riwayat Status Pengiriman</p>
            </div><span class="text-xs text-muted">{{ timelineEvents.length }} event</span>
          </div>
          <div v-if="!timelineEvents.length" class="mt-8 rounded-theme bg-stone-50 p-8 text-center text-sm text-muted">
            Belum ada detail perjalanan pengiriman untuk transaksi ini.</div>
          <ol v-else class="mt-8 ml-2 border-l-2 border-sky-100">
            <li v-for="(event, index) in timelineEvents"
              :key="String(event.nomor_resi || '') + '-' + String(event.waktu || '') + '-' + index"
              class="relative pb-8 pl-8 last:pb-0">
              <span
                class="absolute -left-[11px] top-0 grid h-5 w-5 place-items-center rounded-full border-4 border-white bg-sky-500 shadow-sm"><span
                  v-if="index === timelineEvents.length - 1" class="h-1.5 w-1.5 rounded-full bg-white" /></span>
              <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="font-semibold">{{ event.status || 'Status pengiriman' }}</h3><span
                      v-if="index === timelineEvents.length - 1"
                      class="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">Terbaru</span>
                  </div>
                  <p class="mt-1 text-sm text-muted">{{ event.lokasi || event.ekspedisi || 'Lokasi belum tersedia' }}
                    <span v-if="event.keterangan">· {{ event.keterangan }}</span><span v-if="event.nomor_resi">· Resi {{
                      event.nomor_resi }}</span>
                  </p>
                </div><time class="text-xs text-muted">{{ formatDate(event.waktu) }}</time>
              </div>
            </li>
          </ol>
        </section>
        <section class="mt-6 grid gap-6 lg:grid-cols-2">
          <article class="rounded-theme border border-stone-200 bg-white p-6 shadow-card sm:p-8">
            <h2 class="text-lg font-semibold">Riwayat Revisi MOE</h2>
            <p class="mt-1 text-sm text-muted">Catatan revisi dari MOE.</p>
            <div v-if="!transaction.riwayat_revisi_moe?.length"
              class="mt-6 rounded-theme bg-stone-50 p-5 text-sm text-muted">Belum ada riwayat revisi MOE.</div>
            <div v-else class="mt-6 space-y-4">
              <div v-for="(item, index) in transaction.riwayat_revisi_moe" :key="'moe-' + index"
                class="rounded-theme border border-stone-100 bg-stone-50 p-4">
                <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-sky-600">Revisi {{ index + 1 }}</p>
                <dl class="space-y-2">
                  <div v-for="field in revisionFields(item)" :key="field.label">
                    <dt class="text-xs capitalize text-muted">{{ field.label }}</dt>
                    <dd class="text-sm">{{ field.value }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>
          <article class="rounded-theme border border-stone-200 bg-white p-6 shadow-card sm:p-8">
            <h2 class="text-lg font-semibold">Riwayat Revisi APIP</h2>
            <p class="mt-1 text-sm text-muted">Catatan revisi dari APIP.</p>
            <div v-if="!transaction.riwayat_revisi_apip?.length"
              class="mt-6 rounded-theme bg-stone-50 p-5 text-sm text-muted">Belum ada riwayat revisi APIP.</div>
            <div v-else class="mt-6 space-y-4">
              <div v-for="(item, index) in transaction.riwayat_revisi_apip" :key="'apip-' + index"
                class="rounded-theme border border-stone-100 bg-stone-50 p-4">
                <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-600">Revisi {{ index + 1 }}
                </p>
                <dl class="space-y-2">
                  <div v-for="field in revisionFields(item)" :key="field.label">
                    <dt class="text-xs capitalize text-muted">{{ field.label }}</dt>
                    <dd class="text-sm">{{ field.value }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>
        </section>
        <section class="mt-6 rounded-theme border border-stone-200 bg-white p-6 shadow-card sm:p-8">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">Foto Instalasi per Transaksi</h2>
              <p class="mt-1 text-sm text-muted">Dokumentasi seluruh transaksi untuk sekolah ini. Klik gambar untuk
                memperbesar.</p>
            </div>
            <span class="text-xs text-muted">{{ installationPhotos.length }} foto</span>
          </div>
          <div v-if="!installationPhotos.length"
            class="mt-6 rounded-theme bg-stone-50 p-8 text-center text-sm text-muted">Belum ada foto instalasi.</div>
          <div v-else class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button v-for="photo in installationPhotos" :key="photo.url" type="button"
              class="group overflow-hidden rounded-theme border border-stone-200 bg-stone-50 text-left focus:outline-none focus:ring-4 focus:ring-sky-100"
              @click="selectedPhoto = photo">
              <div class="aspect-[4/3] overflow-hidden"><img :src="photo.url" :alt="'Foto ' + photo.label"
                  class="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
              </div>
              <p class="px-4 py-3 text-sm font-medium capitalize text-ink">{{ photo.label }}</p>
            </button>
          </div>
        </section>
        <div class="mt-6 flex flex-wrap gap-3"><a v-if="transaction.public_bapp_url" :href="transaction.public_bapp_url"
            target="_blank" class="inline-flex items-center gap-2 rounded-theme bg-ink px-4 py-2.5 text-sm font-medium text-white">Buka BAPP<AppIcon name="external" class="h-4 w-4" /></a>
          <NuxtLink to="/hisense"
            class="rounded-theme border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-muted hover:bg-stone-50">
            <AppIcon name="arrow-left" class="mr-1 h-4 w-4" /> Kembali ke daftar</NuxtLink>
        </div>
      </template>
    </main>
    <div v-if="selectedPhoto" class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 sm:p-8"
      role="dialog" aria-modal="true" @click.self="selectedPhoto = null">
      <div class="relative max-h-full max-w-6xl">
        <button type="button"
          class="absolute -right-2 -top-12 rounded-full bg-white/10 px-3 py-1 text-2xl text-white hover:bg-white/20"
          aria-label="Tutup foto" @click="selectedPhoto = null"><AppIcon name="close" /></button>
        <img :src="selectedPhoto.url" :alt="'Foto ' + selectedPhoto.label"
          class="max-h-[85vh] max-w-full rounded-theme bg-white object-contain shadow-2xl" />
        <p class="mt-3 text-center text-sm capitalize text-white">{{ selectedPhoto.label }}</p>
      </div>
    </div>
  </AppShell>
</template>
