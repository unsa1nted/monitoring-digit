<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
type ActivityLog = {
  id: number
  userId: number | null
  username: string
  role: 'Admin' | 'Dinas' | 'Internal'
  action: string
  method: string
  path: string
  detail: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}
type ActivityResponse = { success: boolean; data?: ActivityLog[]; message?: string }

useHead({ title: 'Activity Log | Dashboard Pemantauan Digitalisasi Pembelajaran SMK' })
const config = useRuntimeConfig()
const authUser = useState<{ username: string; role: 'Admin' | 'Dinas' | 'Internal' } | null>('auth-user')
if (authUser.value?.role !== 'Admin') await navigateTo('/')
const { data, pending, error, refresh } = await useFetch<ActivityResponse>('/api/admin/activity-logs', {
  baseURL: config.public.apiBase,
  credentials: 'include',
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined
})

const logs = computed(() => data.value?.data ?? [])
const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))
const methodClass = (method: string) => method === 'GET' ? 'bg-sky-50 text-sky-700' : method === 'POST' ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700'
</script>

<template>
  <AppShell>
    <header class="border-b border-stone-200 bg-white">
      <div class="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 sm:px-8">
        <div>
          <NuxtLink to="/" class="text-sm font-semibold text-sky-600"><AppIcon name="arrow-left" /> Dashboard</NuxtLink>
          <h1 class="mt-3 text-2xl font-semibold tracking-tight">Activity Log</h1>
          <p class="mt-1 text-sm text-muted">Catatan aktivitas user di dalam aplikasi.</p>
        </div>
        <button class="rounded-theme border border-stone-200 px-4 py-2 text-sm text-muted hover:bg-stone-50"
          :disabled="pending" @click="refresh()"><AppIcon name="refresh" class="mr-1 h-4 w-4" :class="{ 'animate-spin': pending }" /> Refresh</button>
      </div>
    </header>
    <main class="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <div v-if="pending" class="rounded-theme border border-stone-200 bg-white p-10 text-center text-sm text-muted">
        Memuat activity log…</div>
      <div v-else-if="error || data?.success === false" class="rounded-theme bg-red-50 p-6 text-sm text-red-700">{{
        data?.message || 'Activity log tidak dapat diambil.' }}</div>
      <section v-else class="overflow-hidden rounded-theme border border-stone-200 bg-white shadow-card">
        <div class="flex items-center justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 class="font-semibold">Aktivitas terbaru</h2>
            <p class="mt-1 text-sm text-muted">{{ logs.length }} aktivitas terakhir</p>
          </div><span class="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Admin
            only</span>
        </div>
        <div v-if="!logs.length" class="p-12 text-center text-sm text-muted">Belum ada aktivitas tercatat.</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th class="px-6 py-4 font-semibold">Waktu</th>
                <th class="px-6 py-4 font-semibold">User</th>
                <th class="px-6 py-4 font-semibold">Aktivitas</th>
                <th class="px-6 py-4 font-semibold">Request</th>
                <th class="px-6 py-4 font-semibold">Detail</th>
                <th class="px-6 py-4 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100">
              <tr v-for="log in logs" :key="log.id" class="hover:bg-sky-50/40">
                <td class="whitespace-nowrap px-6 py-4 text-xs text-muted">{{ formatDate(log.createdAt) }}</td>
                <td class="px-6 py-4">
                  <p class="font-medium">{{ log.username }}</p>
                  <p class="mt-1 text-xs text-muted">{{ log.role }}</p>
                </td>
                <td class="px-6 py-4"><span
                    class="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{{ log.action
                    }}</span></td>
                <td class="px-6 py-4"><span class="mr-2 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    :class="methodClass(log.method)">{{ log.method }}</span><span
                    class="font-mono text-xs text-muted">{{ log.path }}</span></td>
                <td class="max-w-xs px-6 py-4 text-xs text-muted">{{ log.detail || '—' }}</td>
                <td class="px-6 py-4 font-mono text-xs text-muted">{{ log.ipAddress || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </AppShell>
</template>
