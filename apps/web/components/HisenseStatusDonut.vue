<script setup lang="ts">
type StatusRow = { code: string; label: string; description: string; count: number; percentage: number }
const props = defineProps<{ rows: StatusRow[]; total: number }>()
const colors = ['#0284c7', '#2563eb', '#4f46e5', '#0891b2', '#7c3aed', '#16a34a', '#d97706', '#0d9488', '#c026d3', '#65a30d', '#ea580c', '#dc2626', '#be185d']
const activeCode = ref<string | null>(null)
const number = (value: number) => new Intl.NumberFormat('id-ID').format(value)
const percent = (value: number) => `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}%`
const legend = computed(() => props.rows.map((row, index) => ({
  ...row,
  color: colors[index] ?? `hsl(${(index * 137.5) % 360} 55% 40%)`,
  share: props.total ? row.count / props.total * 100 : 0
})))
const segments = computed(() => {
  let offset = 0
  return legend.value.filter(row => row.count > 0).map(row => {
    const segment = { ...row, offset }
    offset += row.share
    return segment
  })
})
const active = computed(() => legend.value.find(row => row.code === activeCode.value))
const statusDescription = computed(() => active.value?.description ?? 'Persentase dihitung dari total unit PID pada provinsi yang dipilih. Setiap unit masuk ke satu status saat ini.')
watch(() => props.rows, () => { activeCode.value = null })
</script>

<template>
  <div
    class="mt-4 grid gap-6 rounded-xl border border-stone-200 bg-stone-50/40 p-4 sm:p-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center"
    @mouseleave="activeCode = null">
    <div class="mx-auto w-full max-w-[280px]">
      <div class="relative aspect-square">
        <svg viewBox="0 0 240 240" class="h-full w-full" role="img"
          :aria-label="`Distribusi status ${number(total)} unit PID. Rincian tersedia pada legenda.`">
          <circle cx="120" cy="120" r="88" fill="none" stroke="#e7e5e4" stroke-width="30" />
          <circle v-for="segment in segments" :key="segment.code" cx="120" cy="120" r="88" fill="none"
            :stroke="segment.color" :stroke-width="activeCode === segment.code ? 36 : 30" pathLength="100"
            :stroke-dasharray="`${segment.share} ${100 - segment.share}`" :stroke-dashoffset="-segment.offset"
            transform="rotate(-90 120 120)"
            class="transition-[opacity,stroke-width] duration-150 motion-reduce:transition-none"
            :opacity="activeCode && activeCode !== segment.code ? 0.3 : 1" @mouseenter="activeCode = segment.code">
            <title>{{ segment.label }}: {{ number(segment.count) }} unit PID ({{ percent(segment.share) }})</title>
          </circle>
        </svg>
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-16 text-center">
          <span class="text-[11px] font-medium text-muted">{{ active ? active.label : 'Total PID' }}</span>
          <strong class="mt-1 text-3xl font-semibold tabular-nums text-ink">{{ number(active ? active.count : total)
          }}</strong>
          <span class="mt-1 text-xs text-muted">{{ active ? `${percent(active.share)} dari total` : 'unit PID' }}</span>
        </div>
      </div>
      <p class="text-center text-xs text-muted">{{ total ? 'Arahkan kursor atau pilih label untuk melihat detail.' :
        'Belum ada data PID pada cakupan ini.' }}</p>
    </div>

    <div class="min-w-0">
      <div
        class="mb-2 grid grid-cols-[minmax(0,1fr)_64px_72px] gap-2 px-3 text-[11px] font-semibold text-muted sm:grid-cols-[minmax(0,1fr)_80px_80px]">
        <span>Status</span><span class="text-right">Unit PID</span><span class="text-right">Persentase</span>
      </div>
      <ul class="space-y-1" aria-label="Legenda status PID">
        <li v-for="item in legend" :key="item.code">
          <button type="button"
            class="grid w-full grid-cols-[minmax(0,1fr)_64px_72px] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:grid-cols-[minmax(0,1fr)_80px_80px]"
            :class="activeCode === item.code ? 'bg-white shadow-sm' : ''" :title="item.description"
            :aria-label="`${item.label}: ${number(item.count)} unit PID, ${percent(item.share)}. ${item.description}`"
            @mouseenter="activeCode = item.code" @focus="activeCode = item.code" @blur="activeCode = null"
            @click="activeCode = item.code" @keydown.esc="activeCode = null">
            <span class="flex min-w-0 items-center gap-2 font-medium text-ink"><span
                class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: item.color }"
                aria-hidden="true" />{{ item.label }}</span>
            <strong class="text-right tabular-nums text-ink">{{ number(item.count) }}</strong>
            <span class="text-right tabular-nums text-muted">{{ percent(item.share) }}</span>
          </button>
        </li>
      </ul>
      <p class="mt-3 min-h-[2.5rem] border-t border-stone-200 px-3 pt-3 text-xs text-muted" aria-live="polite">
        {{ statusDescription }}
      </p>
    </div>
  </div>
</template>
