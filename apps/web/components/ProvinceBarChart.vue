<script setup lang="ts">
type Province = { name: string; schoolCount: number; pidCount: number; schoolPercentage: number; pidPercentage: number }
const props = defineProps<{ provinces: Province[] }>()
const number = (value: number) => new Intl.NumberFormat('id-ID').format(value)
const percent = (value: number) => `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}%`
const chartTop = 48
const chartBottom = 328
const groupWidth = 208
const chartWidth = computed(() => Math.max(600, 80 + props.provinces.length * groupWidth))
const ceiling = computed(() => Math.max(5, Math.ceil(Math.max(0, ...props.provinces.flatMap(p => [p.schoolPercentage, p.pidPercentage])) / 5) * 5))
const ticks = computed(() => Array.from({ length: 6 }, (_, index) => ceiling.value * index / 5))
const y = (value: number) => chartBottom - value / ceiling.value * (chartBottom - chartTop)
function wrapName(name: string) {
  const lines: string[] = []
  for (const word of name.split(' ')) {
    const last = lines.length - 1
    if (last >= 0 && `${lines[last]} ${word}`.length <= 17) lines[last] += ` ${word}`
    else lines.push(word)
  }
  return lines
}
const description = (p: Province) => `${p.name}: ${number(p.schoolCount)} sekolah (${percent(p.schoolPercentage)}); ${number(p.pidCount)} unit PID (${percent(p.pidPercentage)})`
</script>

<template>
  <div class="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400" tabindex="0" role="region" aria-label="Bar chart vertikal sekolah dan PID per provinsi. Gulir ke samping untuk melihat semua provinsi.">
    <svg :viewBox="`0 0 ${chartWidth} 426`" :style="{ minWidth: `${chartWidth}px` }" class="block h-[426px] w-full" role="group" aria-label="Perbandingan persentase sekolah dan PID per provinsi">
      <text x="8" y="18" fill="#78716c" font-size="11">Persentase</text>
      <g v-for="tick in ticks" :key="tick" aria-hidden="true">
        <line x1="58" :x2="chartWidth - 12" :y1="y(tick)" :y2="y(tick)" stroke="#e7e5e4" :stroke-dasharray="tick ? '4 4' : undefined" />
        <text x="48" :y="y(tick) + 4" text-anchor="end" fill="#78716c" font-size="11">{{ percent(tick) }}</text>
      </g>
      <g v-for="(province, index) in provinces" :key="province.name" :transform="`translate(${66 + index * groupWidth}, 0)`" tabindex="0" role="img" :aria-label="description(province)" class="province-bars">
        <title>{{ description(province) }}</title>
        <rect class="province-background" x="2" y="24" :width="groupWidth - 4" height="386" rx="8" fill="transparent" />
        <rect x="30" :y="y(province.schoolPercentage)" width="44" :height="chartBottom - y(province.schoolPercentage)" rx="3" fill="#0ea5e9" />
        <rect x="134" :y="y(province.pidPercentage)" width="44" :height="chartBottom - y(province.pidPercentage)" rx="3" fill="#14b8a6" />
        <text x="52" :y="y(province.schoolPercentage) - 9" text-anchor="middle" fill="#0369a1" font-size="11" font-weight="600" class="tabular-nums">{{ number(province.schoolCount) }} Sekolah</text>
        <text x="156" :y="y(province.pidPercentage) - 9" text-anchor="middle" fill="#0f766e" font-size="11" font-weight="600" class="tabular-nums">{{ number(province.pidCount) }} PID</text>
        <text x="104" y="350" text-anchor="middle" fill="#44403c" font-size="11" font-weight="500">
          <tspan v-for="(line, lineIndex) in wrapName(province.name)" :key="lineIndex" x="104" :dy="lineIndex ? 16 : 0">{{ line }}</tspan>
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.province-bars { outline: none; }
.province-bars:hover .province-background,
.province-bars:focus .province-background { fill: rgb(14 165 233 / 0.06); }
.province-bars:focus .province-background { stroke: #0284c7; }
</style>
