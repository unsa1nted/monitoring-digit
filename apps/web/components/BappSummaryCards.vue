<script setup lang="ts">
type Summary = { perluDireviu: number; totalDisetujui: number; totalSesuaiApip: number; totalReviuApip: number; totalDitolakRevisi: number }
const props = defineProps<{ summary: Summary | null; loading?: boolean }>()
const cards = [
  { key: 'perluDireviu', label: 'Perlu Direviu', tone: 'border-l-sky-500' },
  { key: 'totalDisetujui', label: 'Total Disetujui', tone: 'border-l-teal-500' },
  { key: 'totalSesuaiApip', label: 'Total Sesuai APIP', tone: 'border-l-emerald-500' },
  { key: 'totalReviuApip', label: 'Total Reviu APIP', tone: 'border-l-violet-500' },
  { key: 'totalDitolakRevisi', label: 'Total Ditolak/Revisi', tone: 'border-l-red-500' }
] as const
const number = (value: number) => new Intl.NumberFormat('id-ID').format(value)
</script>

<template>
  <section aria-label="Ringkasan BAPP" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <article v-for="card in cards" :key="card.key" :class="card.tone" class="rounded-theme border border-l-4 border-stone-200 bg-white p-5 shadow-card">
      <p class="text-sm text-muted">{{ card.label }}</p>
      <p class="mt-3 text-3xl font-semibold tracking-tight">{{ props.loading ? '…' : props.summary ? number(props.summary[card.key]) : '—' }}</p>
    </article>
  </section>
</template>
