<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import HisenseProvinceProgress from '~/components/HisenseProvinceProgress.vue'
import ProvinceDistribution from '~/components/ProvinceDistribution.vue'

type Overview = { services?: number; operational?: number; uptime?: number; latency?: number; penerimaPid2026: number; province?: string }

const config = useRuntimeConfig()
const authUser = useState<{ id: number; username: string; role: 'Admin' | 'Dinas'; province: string | null } | null>('auth-user')
useHead({ title: 'Dashboard | Dashboard Pemantauan Digitalisasi Pembelajaran SMK' })
const wibHourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  hourCycle: 'h23'
})
const getWibHour = () => Number(wibHourFormatter.format(new Date()))
const wibHour = useState<number>('dashboard-wib-hour', getWibHour)
const greeting = computed(() => {
  if (wibHour.value >= 5 && wibHour.value < 11) return 'Selamat pagi'
  if (wibHour.value >= 11 && wibHour.value < 15) return 'Selamat siang'
  if (wibHour.value >= 15 && wibHour.value < 18) return 'Selamat sore'
  return 'Selamat malam'
})
let greetingInterval: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  wibHour.value = getWibHour()
  greetingInterval = setInterval(() => {
    wibHour.value = getWibHour()
  }, 60_000)
})

onUnmounted(() => {
  if (greetingInterval !== undefined) clearInterval(greetingInterval)
})

const { data: overview, pending: overviewPending } = await useFetch<Overview>('/api/overview', { key: `overview:${authUser.value?.id}:${authUser.value?.province}`, baseURL: config.public.apiBase, credentials: 'include', headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined })

const stats = computed(() => [
  { label: 'Penerima PID 2026', value: overview.value?.penerimaPid2026 ?? 0, change: 'Jumlah', detail: 'sekolah penerima', tone: 'sky' }
])
</script>

<template>
  <AppShell>
      <header class="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div class="flex h-20 items-center justify-between px-5 sm:px-8">
          <div class="flex items-center gap-3 pl-12 lg:pl-0">
            <div>
              <h1 class="text-xl font-semibold tracking-tight">Dashboard</h1>
            </div>
          </div>
          <div class="flex items-center gap-2"><button class="relative rounded-full p-2.5 text-muted hover:bg-stone-100"
              aria-label="Notifications">
              <AppIcon name="bell" /><span class="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button><button
              class="grid h-9 w-9 place-items-center rounded-full bg-sky-500 text-lg text-white shadow-sm hover:bg-sky-600"
              aria-label="Quick add">
              <AppIcon name="plus" />
            </button></div>
        </div>
      </header>

      <main id="overview" class="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">
        <div class="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 class="text-2xl font-semibold tracking-tight">{{ greeting }}, {{ authUser?.username }} <span
                aria-hidden="true">
                <AppIcon name="hand" />
              </span></h2>
          </div>
        </div>
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article v-for="stat in stats" :key="stat.label"
            class="rounded-theme border border-stone-200 bg-white p-5 shadow-card">
            <div class="flex items-start justify-between">
              <p class="text-sm text-muted">{{ stat.label }}</p><span class="grid h-8 w-8 place-items-center rounded-lg"
                :class="stat.tone === 'sky' ? 'bg-sky-100 text-sky-600' : stat.tone === 'teal' ? 'bg-teal-100 text-teal-600' : stat.tone === 'violet' ? 'bg-violet-100 text-violet-600' : 'bg-amber-100 text-amber-600'">
                <AppIcon name="school" />
              </span>
            </div>
            <p class="mt-4 text-3xl font-semibold tracking-tight">{{ overviewPending ? '—' : stat.value }}</p>
            <p class="mt-2 text-xs"><span class="font-semibold text-teal-600">{{ stat.change }}</span> <span
                class="text-muted">{{ stat.detail }}</span></p>
          </article>
        </section>
        <HisenseProvinceProgress />
        <ProvinceDistribution v-if="authUser?.role === 'Admin'" />
      </main>
    </AppShell>
</template>
