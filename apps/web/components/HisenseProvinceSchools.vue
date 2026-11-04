<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { hisenseProgressStatuses, type HisenseSchoolProgress } from '../../../shared/hisense-progress'

const props = defineProps<{ province: string; schools: HisenseSchoolProgress[]; missingNpsn: number }>()
const search = ref('')
const page = ref(1)
const pageSize = ref(10)
const number = (value: number) => new Intl.NumberFormat('id-ID').format(value)
const knownStatuses = new Set<string>(hisenseProgressStatuses.map(item => item.code))
const installedStatuses = new Set(['INSTALASI SELESAI', 'DISETUJUI', 'REVIU APIP', 'SESUAI APIP', 'REVISI'])
function schoolStatus(school: HisenseSchoolProgress) {
  const count = (...codes: string[]) => school.statuses.reduce((sum, item) => sum + (codes.includes(item.code) ? item.count : 0), 0)
  const installed = school.statuses.reduce((sum, item) => sum + (installedStatuses.has(item.code) ? item.count : 0), 0)
  const progress = `${number(installed)} dari ${number(school.pidCount)} unit sudah diinstal`
  const failed = count('PENGIRIMAN GAGAL', 'INSTALASI GAGAL')
  const delayed = count('INSTALASI TERKENDALA')
  const revision = count('REVISI')
  const unknown = school.statuses.some(item => item.count > 0 && !knownStatuses.has(item.code)) || school.statuses.reduce((sum, item) => sum + item.count, 0) !== school.pidCount
  // Surface issues first, even when other units at the school are installed.
  if (failed) return { label: 'Perlu penanganan', detail: `${number(failed)} unit gagal dikirim/diinstal. ${progress}.`, tone: 'red' }
  if (delayed) return { label: 'Instalasi tertunda', detail: `${number(delayed)} unit terkendala. ${progress}.`, tone: 'amber' }
  if (revision) return { label: 'Perlu revisi', detail: `${number(revision)} unit perlu perbaikan dokumen/foto. ${progress}.`, tone: 'amber' }
  if (unknown || !school.pidCount) return { label: 'Status belum lengkap', detail: progress, tone: 'stone' }
  if (installed === school.pidCount) return { label: 'Sudah diinstal', detail: `Seluruh ${number(school.pidCount)} unit sudah diinstal.`, tone: 'teal' }
  if (installed > 0) return { label: 'Sebagian diinstal', detail: progress, tone: 'sky' }
  if (count('PROSES INSTALASI')) return { label: 'Sedang diinstal', detail: `${number(count('PROSES INSTALASI'))} dari ${number(school.pidCount)} unit sedang dipasang.`, tone: 'sky' }
  if (count('BARANG TIBA')) return { label: 'Menunggu instalasi', detail: `${number(count('BARANG TIBA'))} dari ${number(school.pidCount)} unit sudah tiba dan menunggu pemasangan.`, tone: 'amber' }
  return { label: 'Menunggu kedatangan', detail: 'Unit masih dalam proses pengiriman ke sekolah.', tone: 'sky' }
}
const tones: Record<string, string> = {
  sky: 'bg-sky-50 text-sky-800', teal: 'bg-teal-50 text-teal-800',
  amber: 'bg-amber-50 text-amber-800', red: 'bg-red-50 text-red-800',
  violet: 'bg-violet-50 text-violet-800', stone: 'bg-stone-100 text-stone-700'
}
const filteredSchools = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('id-ID')
  return props.schools.filter(school => !query || school.name.toLocaleLowerCase('id-ID').includes(query) || school.npsn.includes(query))
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredSchools.value.length / pageSize.value)))
const offset = computed(() => (page.value - 1) * pageSize.value)
const rows = computed(() => filteredSchools.value.slice(offset.value, offset.value + pageSize.value).map(school => ({ ...school, displayStatus: schoolStatus(school) })))
const matchingPid = computed(() => filteredSchools.value.reduce((sum, school) => sum + school.pidCount, 0))
watch([search, pageSize, () => props.schools], () => { page.value = 1 }, { flush: 'sync' })
</script>

<template>
  <section class="rounded-xl border border-sky-200 bg-sky-50/30 p-4 sm:p-5" aria-labelledby="province-schools-heading">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 id="province-schools-heading" class="font-semibold text-ink">Daftar sekolah — {{ province }}</h3>
        <p class="mt-1 text-xs text-muted">Status merangkum kondisi PID di setiap sekolah. Jika ada unit gagal, tertunda, atau perlu revisi, kondisi tersebut ditampilkan terlebih dahulu.</p>
      </div>
      <label for="hisense-school-search" class="w-full text-xs font-medium text-muted sm:w-80">Cari sekolah atau NPSN
        <input id="hisense-school-search" v-model="search" type="search" placeholder="Ketik nama sekolah atau NPSN..."
          class="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
      </label>
    </div>
    <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
      <p role="status" aria-live="polite">{{ number(filteredSchools.length) }} sekolah · {{ number(matchingPid) }} unit PID{{ search.trim() ? ' cocok dengan pencarian' : '' }}</p>
      <label class="flex items-center gap-2">Baris per halaman
        <select v-model.number="pageSize" class="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-ink">
          <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option>
        </select>
      </label>
    </div>
    <p v-if="missingNpsn" class="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{{ number(missingNpsn) }} unit PID belum memiliki NPSN sehingga belum dapat dikelompokkan ke sekolah. Unit tersebut tetap dihitung dalam total provinsi.</p>
    <div class="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="bg-stone-50 text-xs text-muted">
          <tr><th scope="col" class="w-16 px-4 py-3">No</th><th scope="col" class="px-4 py-3">Nama Sekolah</th><th scope="col" class="w-32 px-4 py-3 text-right">Jumlah PID</th><th scope="col" class="px-4 py-3">Status</th></tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
          <tr v-for="(school, index) in rows" :key="school.npsn" class="hover:bg-sky-50/40">
            <td class="px-4 py-4 align-top tabular-nums text-muted">{{ number(offset + index + 1) }}</td>
            <th scope="row" class="px-4 py-4 align-top font-medium text-ink">{{ school.name }}<span class="mt-1 block text-xs font-normal text-muted">NPSN {{ school.npsn }}</span></th>
            <td class="px-4 py-4 text-right align-top font-semibold tabular-nums">{{ number(school.pidCount) }} <span class="text-xs font-normal text-muted">unit</span></td>
            <td class="px-4 py-4 align-top">
              <span class="inline-block rounded-lg px-2.5 py-1.5 text-xs font-semibold" :class="tones[school.displayStatus.tone]">{{ school.displayStatus.label }}</span>
              <p class="mt-2 text-xs text-muted">{{ school.displayStatus.detail }}</p>
            </td>
          </tr>
          <tr v-if="!rows.length"><td colspan="4" class="px-4 py-10 text-center text-sm text-muted">{{ search.trim() ? 'Tidak ada sekolah yang cocok dengan pencarian.' : 'Belum ada sekolah dengan NPSN yang tercatat di provinsi ini.' }}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
      <p>Menampilkan {{ filteredSchools.length ? number(offset + 1) : '0' }}–{{ number(Math.min(offset + pageSize, filteredSchools.length)) }} dari {{ number(filteredSchools.length) }} sekolah</p>
      <nav class="flex items-center gap-3" aria-label="Halaman daftar sekolah">
        <button class="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-2 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40" :disabled="page <= 1" @click="page--"><AppIcon name="chevron-left" class="h-4 w-4" />Sebelumnya</button>
        <span>Halaman {{ number(page) }} / {{ number(pageCount) }}</span>
        <button class="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-2 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40" :disabled="page >= pageCount" @click="page++">Berikutnya<AppIcon name="chevron-right" class="h-4 w-4" /></button>
      </nav>
    </div>
  </section>
</template>
