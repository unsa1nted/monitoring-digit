<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { hisenseProgressStatuses, type HisenseProgressResponse } from '../../../shared/hisense-progress'
import HisenseProvinceSchools from './HisenseProvinceSchools.vue'
import HisenseStatusDonut from './HisenseStatusDonut.vue'

const config = useRuntimeConfig()
const authUser = useState<{ id: number; username: string; role: 'Admin' | 'Dinas'; province: string | null } | null>('auth-user')
const isDinas = computed(() => authUser.value?.role === 'Dinas')
const selectedProvince = ref('')
const provinceSearch = ref('')
const summaryHeading = ref<HTMLElement | null>(null)
const schoolsSection = ref<HTMLElement | null>(null)
const { data, status, error, refresh } = await useFetch<HisenseProgressResponse>('/api/hisense/province-progress', {
  key: `hisense-progress:${authUser.value?.id}:${authUser.value?.role}:${authUser.value?.province}`,
  baseURL: config.public.apiBase, credentials: 'include', server: false, lazy: true,
  timeout: 240_000, retry: 0
})
watch(data, value => {
  if (value && isDinas.value) { selectedProvince.value = value.provinces[0]?.key ?? ''; return }
  if (value && selectedProvince.value && !value.provinces.some(province => province.key === selectedProvince.value)) selectedProvince.value = ''
}, { immediate: true })
const loading = computed(() => status.value === 'idle' || status.value === 'pending')
const current = computed(() => selectedProvince.value
  ? data.value?.provinces.find(province => province.key === selectedProvince.value)
  : data.value?.summary)
const scopeName = computed(() => data.value?.provinces.find(province => province.key === selectedProvince.value)?.name ?? (isDinas.value ? authUser.value?.province ?? 'Provinsi Anda' : 'Semua provinsi'))
const selectedProvinceData = computed(() => data.value?.provinces.find(province => province.key === selectedProvince.value))
const number = (value: number) => new Intl.NumberFormat('id-ID').format(value)
const percent = (value: number) => `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}%`
const ratio = (value: number, total: number) => total ? value / total * 100 : 0
const updatedAt = computed(() => data.value ? new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short'
}).format(new Date(data.value.fetchedAt)) : '')
const errorMessage = computed(() => error.value?.data?.message || 'Statistik Hisense SMK belum dapat dimuat. Silakan coba lagi.')
const definitions = new Map(hisenseProgressStatuses.map(item => [item.code as string, item]))
const statusRows = computed(() => (current.value?.statuses ?? []).map(item => ({
  ...item, label: definitions.get(item.code)?.label ?? item.code,
  description: definitions.get(item.code)?.description ?? 'Status tambahan dari Hisense; ditampilkan sesuai respons sumber.'
})))
const unknownStatusCount = computed(() => statusRows.value.filter(item => !definitions.has(item.code)).reduce((sum, item) => sum + item.count, 0))
const provinceRows = computed(() => (data.value?.provinces ?? [])
  .filter(province => province.name.toLowerCase().includes(provinceSearch.value.trim().toLowerCase()))
  .slice().sort((a, b) => b.transactions - a.transactions || a.name.localeCompare(b.name, 'id')))
const cards = computed(() => {
  const summary = current.value
  if (!summary) return []
  return [
    { label: 'Total PID', value: summary.transactions, detail: `Jumlah Sekolah: ${number(summary.schools)}`, tone: 'text-ink' },
    { label: 'Sudah dikirim', value: summary.shipped, detail: 'Kumulatif sudah keluar gudang', tone: 'text-sky-700' },
    { label: 'Instalasi selesai', value: summary.installationComplete, detail: 'Status saat ini: menunggu peninjauan', tone: 'text-teal-700' },
    { label: 'Instalasi terkendala', value: summary.constrained, detail: 'Tertunda karena kendala lapangan', tone: 'text-amber-700' },
    { label: 'Gagal', value: summary.failed, detail: 'Pengiriman gagal + instalasi gagal', tone: 'text-red-700' },
    { label: 'Perlu revisi', value: summary.revision, detail: 'Perbaikan dokumen, foto, atau SN', tone: 'text-violet-700' }
  ]
})
async function chooseProvince(key: string) {
  selectedProvince.value = key
  await nextTick()
  schoolsSection.value?.focus({ preventScroll: true })
  schoolsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <section id="hisense-progress"
    class="mt-6 scroll-mt-24 rounded-theme border border-stone-200 bg-white p-5 shadow-card sm:p-6"
    aria-labelledby="hisense-progress-heading" :aria-busy="loading">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="max-w-3xl">
        <h2 id="hisense-progress-heading" class="mt-1 text-xl font-semibold text-ink">Progres pengiriman &amp; instalasi
          per provinsi</h2>

      </div>
      <button
        class="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-50"
        :disabled="loading" @click="refresh()">
        <AppIcon name="refresh" class="mr-2 h-4 w-4" :class="{ 'animate-spin': loading }" />{{ loading ? 'Memuat...' :
          'Muat ulang' }}
      </button>
    </div>

    <div v-if="loading" class="mt-5 rounded-xl bg-stone-50 px-5 py-12 text-center text-sm text-muted" role="status">
      <AppIcon name="loading" class="h-5 w-5 animate-spin text-sky-600" />
      <p class="mt-3 font-medium">Mengambil statistik Hisense SMK...</p>
      <p class="mt-1 text-xs">Seluruh halaman data unit PID sedang dihimpun. Pengambilan pertama dapat memerlukan waktu.
      </p>
    </div>
    <div v-else-if="error" class="mt-5 rounded-xl bg-red-50 p-5 text-sm text-red-700" role="alert">
      <p class="font-semibold">Statistik belum tersedia</p>
      <p class="mt-1">{{ errorMessage }}</p>
      <button class="mt-3 rounded-lg border border-red-200 px-3 py-1.5 font-medium hover:bg-red-100"
        @click="refresh()">Coba lagi</button>
    </div>
    <template v-else-if="data && current">
      <div class="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-xl bg-stone-50 p-4">
        <label for="hisense-progress-province" class="w-full text-xs font-semibold text-muted sm:w-80">Provinsi yang
          dipantau
          <select id="hisense-progress-province" v-model="selectedProvince"
            class="mt-2 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal text-ink">
            <option v-if="!isDinas" value="">Semua provinsi</option>
            <option v-for="province in data.provinces" :key="province.key" :value="province.key">{{ province.name }}{{
              province.mapped ? '' : ' (belum terpetakan)' }}</option>
          </select>
        </label>
        <div class="text-xs text-muted sm:text-right">
          <p>Data diambil: {{ updatedAt }} WIB</p>
          <p class="mt-1">Hasil disimpan {{ data.cacheSeconds }} detik. Muat ulang untuk memeriksa pembaruan.</p>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 ref="summaryHeading" tabindex="-1" class="scroll-mt-24 font-semibold text-ink">{{ scopeName }}</h3>
        <span class="text-xs text-muted">Setiap ID transaksi Hisense mewakili satu unit PID. Satu sekolah dapat menerima
          beberapa unit PID.</span>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="card in cards" :key="card.label" class="rounded-xl border border-stone-200 p-4">
          <p class="text-xs font-medium text-muted">{{ card.label }}</p>
          <p class="mt-2 text-2xl font-semibold tabular-nums" :class="card.tone">{{ number(card.value) }} <span
              class="text-xs font-normal text-muted">unit PID</span></p>
          <p class="mt-2 text-xs text-muted">{{ card.detail }}</p>
        </article>
      </div>

      <p v-if="!current.transactions" class="mt-4 rounded-lg bg-sky-50 p-4 text-sm text-sky-800" role="status">Belum ada
        data unit PID Hisense SMK untuk {{ scopeName.toLowerCase() }}.</p>
      <p v-if="current.missingNpsn" class="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{{
        number(current.missingNpsn) }} unit PID tidak memiliki NPSN. Unit tetap dihitung dalam Total PID, tetapi tidak
        masuk jumlah sekolah.</p>

      <div v-if="selectedProvinceData" ref="schoolsSection" tabindex="-1" class="mt-6 scroll-mt-24"
        :aria-label="`Daftar sekolah ${scopeName}`">
        <HisenseProvinceSchools :key="selectedProvince" :province="scopeName"
          :schools="selectedProvinceData.schoolDetails ?? []" :missing-npsn="selectedProvinceData.missingNpsn" />
      </div>

      <div class="mt-7">
        <h3 class="font-semibold text-ink">Rincian detail status</h3>

        <HisenseStatusDonut :rows="statusRows" :total="current.transactions" />
      </div>

      <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-semibold text-ink">{{ isDinas ? 'Ringkasan provinsi Anda' : 'Ringkasan seluruh provinsi' }}
          </h3>
          <p class="mt-1 text-xs text-muted">Klik nama provinsi untuk melihat daftar sekolah, jumlah PID, dan status
            setiap sekolah.</p>
        </div>
        <label class="w-full text-xs text-muted sm:w-64">Cari provinsi
          <input v-model="provinceSearch" type="search" placeholder="Nama provinsi..."
            class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-ink" />
        </label>
      </div>
      <div class="mt-4 max-h-[520px] overflow-auto rounded-xl border border-stone-200">
        <table class="w-full min-w-[980px] text-left text-xs">
          <caption class="sr-only">Total PID Hisense SMK dan jumlah sekolah per provinsi. Angka status dihitung dalam
            unit PID. Kolom sudah dikirim merupakan kumulatif.</caption>
          <thead class="sticky top-0 bg-stone-50 text-muted">
            <tr>
              <th scope="col" class="px-4 py-3 font-semibold">Provinsi</th>
              <th scope="col" class="px-3 py-3 text-right font-semibold">Jumlah Sekolah</th>
              <th scope="col" class="px-3 py-3 text-right font-semibold">Total PID</th>
              <th scope="col" class="px-3 py-3 text-right font-semibold">Sudah dikirim<br /><span
                  class="font-normal">kumulatif</span></th>
              <th scope="col" class="px-3 py-3 text-right font-semibold">Instalasi selesai<br /><span
                  class="font-normal">status saat ini</span></th>
              <th scope="col" class="px-3 py-3 text-right font-semibold">Terkendala</th>
              <th scope="col" class="px-3 py-3 text-right font-semibold">Gagal</th>
              <th scope="col" class="px-3 py-3 text-right font-semibold">Revisi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            <tr v-for="province in provinceRows" :key="province.key"
              :class="selectedProvince === province.key ? 'bg-sky-50' : 'hover:bg-stone-50'">
              <th scope="row" class="px-4 py-3 font-medium">
                <button class="text-left font-semibold text-sky-700 underline-offset-4 hover:underline"
                  :aria-pressed="selectedProvince === province.key" @click="chooseProvince(province.key)">{{
                    province.name }}</button>
                <span v-if="!province.mapped" class="mt-1 block text-[10px] text-amber-700">Nama provinsi belum
                  terpetakan</span>
              </th>
              <td class="px-3 py-3 text-right tabular-nums">{{ number(province.schools) }}</td>
              <td class="px-3 py-3 text-right font-semibold tabular-nums">{{ number(province.transactions) }}</td>
              <td class="px-3 py-3 text-right tabular-nums text-sky-700">{{ number(province.shipped) }}<span
                  class="mt-1 block text-[10px] text-muted">{{ percent(ratio(province.shipped, province.transactions))
                  }}</span></td>
              <td class="px-3 py-3 text-right tabular-nums text-teal-700">{{ number(province.installationComplete)
                }}<span class="mt-1 block text-[10px] text-muted">{{ percent(ratio(province.installationComplete,
                  province.transactions)) }}</span></td>
              <td class="px-3 py-3 text-right tabular-nums text-amber-700">{{ number(province.constrained) }}</td>
              <td class="px-3 py-3 text-right tabular-nums text-red-700">{{ number(province.failed) }}</td>
              <td class="px-3 py-3 text-right tabular-nums text-violet-700">{{ number(province.revision) }}</td>
            </tr>
            <tr v-if="!provinceRows.length">
              <td colspan="8" class="p-8 text-center text-muted">Tidak ada provinsi yang cocok dengan pencarian.</td>
            </tr>
          </tbody>
        </table>
      </div>

    </template>
  </section>
</template>
