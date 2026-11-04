<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
type Transaction = { id_transaksi?: string; kode_direktorat?: string; nama_batch?: string | null; nama_termin?: string | null; serial_number?: string | null; kode_status_progress?: string | null; public_bapp_url?: string | null; jumlah_pid?: number; group_count?: number; npsn_info?: { npsn?: string; nama_sekolah?: string; propinsi?: string; kabupaten_kota?: string; kecamatan?: string; qty?: number | null } | null;[key: string]: unknown }
type ResponseData = { success: boolean; data?: Transaction[]; meta?: { count: number; sources: string[]; scope: string; page_count?: number; current_page?: number; has_next_page?: boolean; limit?: number }; message?: string }

const route = useRoute()
const isDetailRoute = computed(() => Boolean(route.params.id))
useHead({ title: computed(() => route.params.id ? 'Detail Pengiriman | Dashboard Pemantauan Digitalisasi Pembelajaran SMK' : 'Data Hisense | Dashboard Pemantauan Digitalisasi Pembelajaran SMK') })
const config = useRuntimeConfig()
const authUser = useState<{ id: number; role: 'Admin' | 'Dinas'; province: string | null } | null>('auth-user')
const search = ref('')
const status = ref('')
const provinsi = ref(authUser.value?.role === 'Dinas' ? authUser.value.province ?? '' : '')
const kabKota = ref('')
const kecamatan = ref('')
const page = ref(1)
const statuses = ['BARANG SIAP', 'PROSES PENGIRIMAN', 'MENUJU ALAMAT', 'BARANG TIBA', 'PROSES INSTALASI', 'INSTALASI SELESAI', 'REVISI', 'DISETUJUI', 'REVIU APIP', 'SESUAI APIP', 'INSTALASI TERKENDALA', 'INSTALASI GAGAL', 'PENGIRIMAN GAGAL']
const accountScope = `${authUser.value?.id}:${authUser.value?.role}:${authUser.value?.province}`
const { data, pending, error, refresh } = await useFetch<ResponseData>('/api/hisense/transactions', { key: `hisense-list:${accountScope}`, baseURL: config.public.apiBase, credentials: 'include', headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined, query: { search, status, provinsi, kab_kota: kabKota, kecamatan, page }, watch: false, immediate: !isDetailRoute.value, timeout: 240_000, retry: 0 })
const { data: provinceData } = await useFetch<{ data: string[] }>('/api/schools/provinces', { key: `school-provinces:${accountScope}`, baseURL: config.public.apiBase, credentials: 'include', headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined, immediate: !isDetailRoute.value })
const { data: locationData } = await useFetch<{ kabKotas: string[]; kecamatans: string[] }>('/api/schools/locations', { key: `school-locations:${accountScope}`, baseURL: config.public.apiBase, credentials: 'include', headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined, query: { provinsi, kab_kota: kabKota }, immediate: !isDetailRoute.value })
const provinceOptions = computed(() => provinceData.value?.data ?? [])
const kabKotaOptions = computed(() => locationData.value?.kabKotas ?? [])
const kecamatanOptions = computed(() => locationData.value?.kecamatans ?? [])
watch(provinsi, () => { kabKota.value = ''; kecamatan.value = '' })
watch(kabKota, () => { kecamatan.value = '' })
const apiRows = computed(() => data.value?.data ?? [])
const rows = computed(() => {
  const grouped = new Map<string, Transaction>()
  for (const row of apiRows.value) {
    const key = row.npsn_info?.npsn || row.id_transaksi || String(grouped.size)
    const quantity = row.npsn_info?.qty ?? row.jumlah_pid ?? 0
    const existing = grouped.get(key)
    if (!existing) grouped.set(key, { ...row, jumlah_pid: quantity, group_count: 1 })
    else {
      existing.group_count = (existing.group_count ?? 1) + 1
      existing.jumlah_pid = Math.max(existing.jumlah_pid ?? 0, quantity)
    }
  }
  return [...grouped.values()]
})
const runSearch = () => { page.value = 1; refresh() }
const goToPage = (value: number) => { if (value < 1 || value > (data.value?.meta?.page_count ?? 1)) return; page.value = value; refresh() }
const statusClass = (value?: string | null) => value === 'DISETUJUI' || value === 'SESUAI APIP' ? 'bg-teal-50 text-teal-700' : value === 'REVISI' || value === 'INSTALASI TERKENDALA' ? 'bg-amber-50 text-amber-700' : value === 'INSTALASI GAGAL' || value === 'PENGIRIMAN GAGAL' ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-700'
</script>

<template>
  <AppShell v-if="!route.params.id">
    <div class="hisense-page min-h-screen bg-canvas text-ink" :class="{ 'is-loading': pending }">
      <header class="border-b border-stone-200 bg-white">
        <div class="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div>
            <NuxtLink to="/" class="text-sm font-semibold text-sky-600"><AppIcon name="arrow-left" /> Dashboard</NuxtLink>
            <h1 class="mt-3 text-2xl font-semibold tracking-tight">Data Pengiriman PID</h1>
            <p class="mt-1 text-sm text-muted">Status pengiriman unit PID
            </p>
          </div><span class="rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">GET only</span>
        </div>
      </header>
      <main class="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">
        <section class="rounded-theme border border-stone-200 bg-white p-5 shadow-card sm:p-6">
          <div class="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-12">
            <div class="sm:col-span-2 xl:col-span-4">
              <label for="search" class="mb-2 block text-sm font-medium">Cari transaksi</label>
              <input id="search" v-model="search"
                class="h-12 w-full rounded-theme border border-stone-200 px-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="NPSN, nama sekolah, nomor resi, serial number, atau ID transaksi"
                @keyup.enter="runSearch" />
            </div>
            <div class="xl:col-span-2">
              <label for="provinsi" class="mb-2 block text-sm font-medium">Provinsi</label>
              <select id="provinsi" v-model="provinsi" :disabled="authUser?.role === 'Dinas'"
                class="h-12 w-full rounded-theme border border-stone-200 bg-white px-4 text-sm outline-none focus:border-sky-400">
                <option v-if="authUser?.role === 'Admin'" value="">Semua provinsi</option>
                <option v-for="item in provinceOptions" :key="item" :value="item">{{ item }}</option>
              </select>
            </div>
            <div class="xl:col-span-2">
              <label for="kab-kota" class="mb-2 block text-sm font-medium">Kabupaten/Kota</label>
              <select id="kab-kota" v-model="kabKota" :disabled="!provinsi || !kabKotaOptions.length"
                class="h-12 w-full rounded-theme border border-stone-200 bg-white px-4 text-sm outline-none disabled:cursor-not-allowed disabled:bg-stone-100">
                <option value="">Semua kab/kota</option>
                <option v-for="item in kabKotaOptions" :key="item" :value="item">{{ item }}</option>
              </select>
            </div>
            <div class="xl:col-span-2">
              <label for="kecamatan" class="mb-2 block text-sm font-medium">Kecamatan</label>
              <select id="kecamatan" v-model="kecamatan" :disabled="!kabKota || !kecamatanOptions.length"
                class="h-12 w-full rounded-theme border border-stone-200 bg-white px-4 text-sm outline-none disabled:cursor-not-allowed disabled:bg-stone-100">
                <option value="">Semua kecamatan</option>
                <option v-for="item in kecamatanOptions" :key="item" :value="item">{{ item }}</option>
              </select>
            </div>
            <div class="xl:col-span-1">
              <label for="status" class="mb-2 block text-sm font-medium">Status</label>
              <select id="status" v-model="status"
                class="h-12 w-full rounded-theme border border-stone-200 bg-white px-4 text-sm outline-none focus:border-sky-400">
                <option value="">Semua status</option>
                <option v-for="item in statuses" :key="item">{{ item }}</option>
              </select>
            </div>
            <button
              class="h-12 w-full rounded-theme bg-ink px-5 text-sm font-medium text-white transition hover:bg-stone-700 sm:col-span-2 xl:col-span-1"
              @click="runSearch">Cari data</button>
          </div>
        </section>
        <div v-if="pending"
          class="hisense-list-loading mt-6 rounded-theme border border-stone-200 bg-white p-10 shadow-card"
          role="status" aria-live="polite"><span>Memuat Data..</span><AppIcon name="loading" class="ml-2 h-4 w-4 animate-spin" /></div>
        <section class="mt-6 overflow-hidden rounded-theme border border-stone-200 bg-white shadow-card">
          <div class="flex items-center justify-between border-b border-stone-100 px-6 py-5">
            <div>
              <h2 class="font-semibold">Transaksi instalasi</h2>
              <p class="mt-1 text-sm text-muted">Data progress tersinkron dengan Hisense</p>
            </div><span class="text-xs text-muted">{{ pending ? 'Memuat…' : `${rows.length} baris` }}</span>
          </div>
          <div v-if="pending" class="p-12 text-center text-sm text-muted">Mengambil data dari Hisense…</div>
          <div v-else-if="error || data?.success === false"
            class="m-6 rounded-theme bg-red-50 p-5 text-sm text-red-700">
            {{ data?.message || 'Data Hisense belum dapat diambil. Periksa konfigurasi kredensial Hisense di server API.' }}
          </div>
          <div v-else-if="!rows.length" class="p-12 text-center text-sm text-muted">Belum ada data yang cocok dengan
            filter.</div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th class="px-6 py-4 font-semibold">Sekolah</th>
                  <th class="px-6 py-4 font-semibold">Provinsi / Kab. Kota</th>
                  <th class="px-6 py-4 font-semibold">Direktorat</th>
                  <th class="px-6 py-4 font-semibold">Status</th>
                  <th class="px-6 py-4 font-semibold">Unit PID</th>
                  <th class="px-6 py-4 font-semibold">Transaksi</th>
                  <th class="px-6 py-4" />
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-100">
                <tr v-for="row in rows" :key="row.id_transaksi" class="transition hover:bg-sky-50/40">
                  <td class="px-6 py-4">
                    <p class="font-medium">{{ row.npsn_info?.nama_sekolah || 'Nama sekolah tidak tersedia' }}</p>
                    <p class="mt-1 text-xs text-muted">NPSN {{ row.npsn_info?.npsn || '—' }}</p>
                  </td>
                  <td class="px-6 py-4">
                    <p>{{ row.npsn_info?.propinsi || '—' }}</p>
                    <p class="mt-1 text-xs text-muted">{{ row.npsn_info?.kabupaten_kota || '—' }}</p>
                  </td>
                  <td class="px-6 py-4 text-muted">{{ row.kode_direktorat || '—' }}</td>
                  <td class="px-6 py-4"><span class="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold"
                      :class="statusClass(row.kode_status_progress)">{{ row.kode_status_progress || 'Belum ada status'
                      }}</span></td>
                  <td class="px-6 py-4"><span
                      class="inline-flex whitespace-nowrap rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{{
                        row.jumlah_pid ?? 0 }} Unit PID</span></td>
                  <td class="px-6 py-4">
                    <p class="font-mono text-xs">{{ row.id_transaksi || '—' }}</p>
                    <p class="mt-1 text-xs text-muted">{{ row.serial_number || 'SN belum tersedia' }}</p>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <NuxtLink v-if="row.id_transaksi" :to="`/hisense/${encodeURIComponent(row.id_transaksi)}`"
                      class="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50">
                      Detail</NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <div v-if="(data?.meta?.page_count ?? 1) > 1"
          class="mt-4 flex items-center justify-between rounded-theme border border-stone-200 bg-white px-5 py-4 shadow-card">
          <p class="text-sm text-muted">Halaman {{ data?.meta?.current_page ?? page }} dari {{ data?.meta?.page_count }}
          </p>
          <div class="flex items-center gap-2"><button
              class="rounded-full border border-stone-200 px-4 py-2 text-sm text-muted disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="page <= 1 || pending" @click="goToPage(page - 1)"><AppIcon name="arrow-left" /> Sebelumnya</button><button
              class="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!(data?.meta?.has_next_page) || pending" @click="goToPage(page + 1)">Berikutnya <AppIcon name="arrow-right" /></button>
          </div>
        </div>
      </main>
    </div>
  </AppShell>
  <NuxtPage v-else />
</template>
