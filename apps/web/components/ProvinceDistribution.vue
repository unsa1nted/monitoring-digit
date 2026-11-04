<script setup lang="ts">
import mapProvinces from '~/assets/data/indonesia-provinces.json'
import ProvinceBarChart from './ProvinceBarChart.vue'

type Province = { name: string; schoolCount: number; pidCount: number; schoolPercentage: number; pidPercentage: number }
type Distribution = { totals: { schools: number; pid: number }; provinces: Province[]; unmapped: Province[] }
const config = useRuntimeConfig()
const { data, pending, error, refresh } = await useFetch<Distribution>('/api/admin/province-statistics', {
  baseURL: config.public.apiBase, credentials: 'include',
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined
})
const metric = ref<'schoolPercentage' | 'pidPercentage'>('schoolPercentage')
const selected = ref<string | null>(null)
const mapContainer = ref<HTMLElement | null>(null)
const tooltip = ref({ x: 12, y: 12 })
const number = (value: number) => new Intl.NumberFormat('id-ID').format(value)
const percent = (value: number) => `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}%`
const byName = computed(() => new Map(data.value?.provinces.map(p => [p.name, p]) ?? []))
const activeProvince = computed(() => selected.value ? byName.value.get(selected.value) : undefined)
const ranked = computed(() => [...(data.value?.provinces ?? [])].sort((a, b) => b[metric.value] - a[metric.value] || a.name.localeCompare(b.name, 'id')))
const maximum = computed(() => Math.max(1, ...ranked.value.map(p => p[metric.value])))
const color = (name: string) => {
  const value = byName.value.get(name)?.[metric.value] ?? 0
  return value ? `hsl(${metric.value === 'schoolPercentage' ? 199 : 166} 75% ${85 - value / maximum.value * 48}%)` : '#e7e5e4'
}
function showProvince(name: string, event: MouseEvent | FocusEvent | KeyboardEvent) {
  selected.value = name
  const bounds = mapContainer.value?.getBoundingClientRect()
  if (!bounds) return
  if ('clientX' in event) tooltip.value = { x: event.clientX - bounds.left + 12, y: event.clientY - bounds.top + 16 }
  else {
    const target = (event.target as Element).getBoundingClientRect()
    tooltip.value = { x: target.left - bounds.left + target.width / 2, y: target.top - bounds.top + target.height / 2 }
  }
}
const describe = (p: Province) => `${p.name}: ${number(p.schoolCount)} sekolah (${percent(p.schoolPercentage)}); ${number(p.pidCount)} PID (${percent(p.pidPercentage)})`
</script>

<template>
  <section class="mt-6 rounded-theme border border-stone-200 bg-white p-5 shadow-card sm:p-6"
    aria-labelledby="province-heading">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[.16em] text-sky-600">Distribusi nasional</p>
        <h2 id="province-heading" class="mt-1 text-xl font-semibold text-ink">Sebaran sekolah &amp; PID per provinsi
        </h2>

      </div>
      <label class="text-xs font-medium text-muted">Warna peta &amp; urutan chart
        <select v-model="metric"
          class="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-ink">
          <option value="schoolPercentage">Jumlah sekolah</option>
          <option value="pidPercentage">Total PID</option>
        </select>
      </label>
    </div>

    <div v-if="pending" class="py-20 text-center text-sm text-muted" role="status">Memuat sebaran sekolah dan PID...
    </div>
    <div v-else-if="error" class="mt-6 rounded-xl bg-red-50 p-6 text-sm text-red-700" role="alert">
      Data sebaran provinsi belum dapat dimuat.
      <button class="ml-2 rounded-lg border border-red-200 px-3 py-1 font-semibold hover:bg-red-100"
        @click="refresh()">Coba lagi</button>
    </div>
    <template v-else-if="data">
      <div class="mt-5 flex flex-wrap gap-x-8 gap-y-2 rounded-xl bg-stone-50 px-4 py-3 text-sm">
        <span>Total sekolah <strong class="ml-2 text-lg text-sky-700">{{ number(data.totals.schools) }}</strong></span>
        <span>Total PID <strong class="ml-2 text-lg text-teal-700">{{ number(data.totals.pid) }}</strong></span>

      </div>
      <p v-if="!data.totals.schools && !data.totals.pid" class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
        role="status">Belum ada data sekolah dan PID. Seluruh provinsi ditampilkan dengan nilai 0.</p>

      <div ref="mapContainer" class="relative mt-5 rounded-xl border border-sky-100 bg-sky-50/50"
        @mouseleave="selected = null" @keydown.esc="selected = null">
        <div class="overflow-x-auto p-2 sm:p-4">
          <svg viewBox="0 0 1000 390" class="w-full min-w-[620px]" role="group"
            aria-label="Peta distribusi sekolah dan PID di 38 provinsi Indonesia">
            <path v-for="province in mapProvinces" :key="province.name" :d="province.path" :fill="color(province.name)"
              fill-rule="evenodd" :stroke="selected === province.name ? '#0c4a6e' : '#fff'"
              :stroke-width="selected === province.name ? 2 : 0.7" tabindex="0" role="button"
              :aria-label="byName.get(province.name) ? describe(byName.get(province.name)!) : province.name"
              class="province-region cursor-pointer outline-none" @mouseenter="showProvince(province.name, $event)"
              @mousemove="showProvince(province.name, $event)" @focus="showProvince(province.name, $event)"
              @blur="selected = null" @click="showProvince(province.name, $event)"
              @keydown.enter.prevent="showProvince(province.name, $event)"
              @keydown.space.prevent="showProvince(province.name, $event)" />
          </svg>
        </div>
        <div v-if="activeProvince" role="status"
          class="pointer-events-none absolute z-10 w-60 rounded-xl border border-stone-200 bg-white p-4 text-sm shadow-xl"
          :style="{ left: `clamp(8px, ${tooltip.x}px, calc(100% - 248px))`, top: `clamp(8px, ${tooltip.y}px, calc(100% - 132px))` }">
          <p class="mb-3 font-semibold text-ink">{{ activeProvince.name }}</p>
          <div class="flex justify-between gap-3"><span class="text-muted">Sekolah</span><strong class="text-sky-700">{{
            number(activeProvince.schoolCount) }} <span class="font-normal">({{
                percent(activeProvince.schoolPercentage) }})</span></strong></div>
          <div class="mt-2 flex justify-between gap-3"><span class="text-muted">Total PID</span><strong
              class="text-teal-700">{{ number(activeProvince.pidCount) }} <span class="font-normal">({{
                percent(activeProvince.pidPercentage) }})</span></strong></div>
        </div>
      </div>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <div class="flex items-center gap-2"><span class="h-3 w-3 rounded bg-stone-200" />0 <span
            class="ml-3">Rendah</span><span class="h-3 w-24 rounded"
            :style="{ background: metric === 'schoolPercentage' ? 'linear-gradient(to right, #bce6f7, #187da6)' : 'linear-gradient(to right, #bcf7e9, #18a685)' }" /><span>Tinggi</span>
        </div>

      </div>

      <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 class="font-semibold text-ink">Perbandingan persentase per provinsi</h3>
        <div class="flex gap-4 text-xs text-muted"><span class="flex items-center gap-2"><i
              class="h-2.5 w-2.5 rounded-sm bg-sky-500" />Sekolah</span><span class="flex items-center gap-2"><i
              class="h-2.5 w-2.5 rounded-sm bg-teal-500" />PID</span></div>
      </div>
      <p class="mt-1 text-xs text-muted">Sebaran 38 Provinsi Penerima PID. Tinggi batang menunjukkan persentase dari total nasional; angka di atas batang menunjukkan jumlah sekolah atau unit PID. Gulir ke samping untuk melihat seluruh provinsi.</p>
      <ProvinceBarChart :provinces="ranked" />
      <div v-if="data.unmapped.length" class="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        <p class="font-semibold">Data belum terpetakan</p>
        <p class="mt-1 text-xs">Nama provinsi berikut belum cocok dengan peta. Nilainya tetap dihitung dalam total
          nasional.</p>
        <ul class="mt-2 space-y-1">
          <li v-for="province in data.unmapped" :key="province.name">{{ describe(province) }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.province-region:hover,
.province-region:focus {
  stroke: #0c4a6e;
  stroke-width: 2;
  filter: brightness(0.92);
}
</style>
