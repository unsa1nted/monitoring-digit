<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
const authUser = useState<{ username: string; role: 'Admin' | 'Dinas' | 'Internal'; province: string | null } | null>('auth-user')
const route = useRoute()
const sidebarOpen = ref(false)
const config = useRuntimeConfig()
const loggingOut = ref(false)
const logoutError = ref('')
type BappNotification = { id: number; idTransaksi: string; namaSekolah: string | null; npsn: string }
const bappNotifications = ref<BappNotification[]>([])
const notificationError = ref('')
const acknowledgingNotifications = ref(false)
const notificationDialog = ref<HTMLDivElement | null>(null)
const notificationCloseButton = ref<HTMLButtonElement | null>(null)
let notificationTimer: ReturnType<typeof setInterval> | undefined
let notificationRequest = 0
async function loadBappNotifications() {
  if (authUser.value?.role !== 'Internal' || acknowledgingNotifications.value) return
  const request = ++notificationRequest
  try {
    const result = await $fetch<{ notifications: BappNotification[] }>('/api/bapp-review/notifications', { baseURL: config.public.apiBase, credentials: 'include' })
    if (request === notificationRequest && !acknowledgingNotifications.value) bappNotifications.value = result.notifications
  } catch { /* Coba lagi pada interval berikutnya. */ }
}
async function acknowledgeBappNotifications(openBapp = false) {
  if (acknowledgingNotifications.value || !bappNotifications.value.length) return
  acknowledgingNotifications.value = true
  notificationRequest++
  notificationError.value = ''
  try {
    await $fetch('/api/bapp-review/notifications/read', { baseURL: config.public.apiBase, credentials: 'include', method: 'POST', body: { ids: bappNotifications.value.map(item => item.id) } })
    bappNotifications.value = []
    if (openBapp) await navigateTo('/cek-bapp')
  } catch { notificationError.value = 'Notifikasi belum dapat ditutup. Coba lagi.' }
  finally { acknowledgingNotifications.value = false }
}
watch(() => bappNotifications.value.length, (count, previous) => { if (count && !previous) nextTick(() => notificationCloseButton.value?.focus()) })
function onNotificationKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); void acknowledgeBappNotifications(false); return }
  if (event.key !== 'Tab') return
  const buttons = notificationDialog.value?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
  if (!buttons?.length) return
  if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1]?.focus() }
  else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0]?.focus() }
}
onMounted(() => {
  if (authUser.value?.role !== 'Internal') return
  void loadBappNotifications()
  notificationTimer = setInterval(() => { void loadBappNotifications() }, 30_000)
})
onUnmounted(() => { if (notificationTimer !== undefined) clearInterval(notificationTimer) })
const logout = async () => {
  if (loggingOut.value) return
  loggingOut.value = true
  logoutError.value = ''
  try {
    await $fetch('/api/auth/logout', { baseURL: config.public.apiBase, method: 'POST', credentials: 'include' })
    authUser.value = null
    clearNuxtData()
    await navigateTo('/login', { replace: true })
  } catch {
    logoutError.value = 'Logout gagal. Periksa koneksi lalu coba lagi.'
  } finally {
    loggingOut.value = false
  }
}

const navClass = (path: string) => (path === '/hisense' ? route.path.startsWith('/hisense') : route.path === path)
  ? 'flex items-center gap-3 rounded-theme bg-white px-3 py-2.5 font-medium text-ink shadow-sm'
  : 'flex items-center gap-3 rounded-theme px-3 py-2.5 font-medium text-ink hover:bg-white'
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink">
    <template v-if="authUser?.role === 'Internal'">
      <header class="border-b border-stone-200 bg-stone-50">
        <div class="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <p class="font-semibold tracking-tight">Dashboard Pemantauan Digitalisasi Pembelajaran SMK</p>
          <div class="flex items-center gap-3 text-sm">
            <span class="text-muted">{{ authUser.username }}</span>
            <button type="button" :disabled="loggingOut" class="rounded-theme border border-stone-300 px-3 py-2 font-medium hover:bg-stone-200 disabled:opacity-50" @click="logout">
              <AppIcon :name="loggingOut ? 'loading' : 'logout'" :class="{ 'animate-spin': loggingOut }" class="mr-1 h-4 w-4" />{{ loggingOut ? 'Keluar…' : 'Logout' }}
            </button>
          </div>
        </div>
        <nav aria-label="Menu Internal" class="flex gap-2 overflow-x-auto px-5 pb-4 text-sm sm:px-8">
          <NuxtLink to="/" :class="route.path === '/' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:bg-white'" class="inline-flex shrink-0 items-center gap-2 rounded-theme px-4 py-2.5 font-medium"><AppIcon name="home" class="h-4 w-4" />Dashboard</NuxtLink>
          <NuxtLink to="/bapp-fisik" :class="route.path === '/bapp-fisik' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:bg-white'" class="inline-flex shrink-0 items-center gap-2 rounded-theme px-4 py-2.5 font-medium"><AppIcon name="package" class="h-4 w-4" />BAPP Fisik</NuxtLink>
          <NuxtLink to="/cek-bapp" :class="route.path === '/cek-bapp' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:bg-white'" class="inline-flex shrink-0 items-center gap-2 rounded-theme px-4 py-2.5 font-medium"><AppIcon name="clipboard-check" class="h-4 w-4" />Cek BAPP</NuxtLink>
          <NuxtLink to="/rekap-scan" :class="route.path === '/rekap-scan' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:bg-white'" class="inline-flex shrink-0 items-center gap-2 rounded-theme px-4 py-2.5 font-medium"><AppIcon name="chart" class="h-4 w-4" />Rekap Scan BAPP</NuxtLink>
        </nav>
        <p v-if="logoutError" role="alert" class="px-5 pb-3 text-xs text-red-700 sm:px-8">{{ logoutError }}</p>
      </header>
      <div><slot /></div>
    </template>
    <template v-else>
    <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-stone-950/30 lg:hidden" @click="sidebarOpen = false" />
    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r border-stone-200 bg-stone-50 transition-transform lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : ''">
      <div class="flex h-20 items-center gap-3 px-6">

        <div>
          <p class="font-semibold tracking-tight">Dashboard Pemantauan Digitalisasi Pembelajaran SMK</p>
        </div>
        <button class="ml-auto rounded-lg p-2 text-muted hover:bg-stone-200 lg:hidden" aria-label="Close menu"
          @click="sidebarOpen = false">
          <AppIcon name="close" />
        </button>
      </div>
      <div v-if="authUser?.role !== 'Internal'" class="px-4 py-3"><button
          class="flex w-full items-center gap-3 rounded-theme border border-stone-200 bg-white px-3 py-2.5 text-left text-sm text-muted shadow-sm hover:border-sky-300"><span
            class="text-base">
            <AppIcon name="search" />
          </span><span>Search...</span><span
            class="ml-auto inline-flex items-center gap-1 rounded border border-stone-200 px-1.5 py-0.5 text-[10px]">
            <AppIcon name="command" class="h-3 w-3" /> K
          </span></button></div>
      <nav class="flex flex-col gap-1 px-4 py-2 text-sm">
        <NuxtLink v-if="authUser?.role !== 'Internal'" to="/" :class="navClass('/')" @click="sidebarOpen = false"><span class="w-5 text-center text-sky-500">
            <AppIcon name="home" />
          </span>Dashboard</NuxtLink>
        <NuxtLink v-if="authUser?.role !== 'Internal'" to="/hisense" :class="navClass('/hisense')" @click="sidebarOpen = false"><span
            class="w-5 text-center text-sky-500">
            <AppIcon name="truck" />
          </span>Data Hisense</NuxtLink>
        <NuxtLink v-if="authUser?.role === 'Admin'" to="/rekap-scan" :class="navClass('/rekap-scan')" @click="sidebarOpen = false">
          <span class="w-5 text-center text-sky-500"><AppIcon name="chart" /></span>Rekap Scan BAPP
        </NuxtLink>
        <NuxtLink v-if="authUser?.role === 'Admin'" to="/assign-npsn-bapp" :class="navClass('/assign-npsn-bapp')" @click="sidebarOpen = false">
            <span class="w-5 text-center text-sky-500"><AppIcon name="school" /></span>Kelola BAPP
        </NuxtLink>
        <NuxtLink v-if="authUser?.role === 'Admin'" to="/users" :class="navClass('/users')" @click="sidebarOpen = false">
          <span class="w-5 text-center text-sky-500"><AppIcon name="users" /></span>Kelola User
        </NuxtLink>
        <NuxtLink v-if="authUser?.role === 'Admin'" to="/activity"
          :class="route.path === '/activity' ? 'flex items-center gap-3 rounded-theme bg-violet-50 px-3 py-2.5 font-medium text-violet-700' : 'flex items-center gap-3 rounded-theme px-3 py-2.5 font-medium text-violet-700 hover:bg-violet-50'"
          @click="sidebarOpen = false"><span class="w-5 text-center text-violet-500">
            <AppIcon name="history" />
          </span>Activity Log
        </NuxtLink>
        <div v-if="authUser?.role === 'Admin'" class="mt-3 rounded-theme bg-white p-4 shadow-card">
          <div class="mb-3 flex items-center justify-between"><span class="text-xs font-semibold">API status</span><span
              class="h-2 w-2 rounded-full bg-teal-500" /></div>
          <p class="text-xs leading-5 text-muted">All monitoring checks are running normally.</p>
        </div>
      </nav>
      <div class="mt-auto border-t border-stone-200 p-4"><div
          class="flex w-full items-center gap-3 rounded-theme p-2 text-left">
          <div class="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">{{
            authUser?.username?.slice(0, 2).toUpperCase() }}</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ authUser?.username }}</p>
            <p class="truncate text-xs text-muted">{{ authUser?.role }}</p>
            <p v-if="authUser?.province" class="truncate text-xs text-sky-700">{{ authUser.province }}</p>
          </div>
        </div>
        <p v-if="logoutError" role="alert" class="mt-2 text-xs text-red-700">{{ logoutError }}</p>
        <button type="button" :disabled="loggingOut" class="mt-3 flex w-full items-center justify-center gap-2 rounded-theme border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-200 disabled:opacity-50" @click="logout">
          <AppIcon :name="loggingOut ? 'loading' : 'logout'" :class="{ 'animate-spin': loggingOut }" />
          {{ loggingOut ? 'Keluar…' : 'Logout' }}
        </button>
      </div>
    </aside>
    <div class="lg:pl-72"><button
        class="fixed left-4 top-4 z-20 rounded-lg border border-stone-200 bg-white p-2 text-muted shadow-sm lg:hidden"
        aria-label="Open menu" @click="sidebarOpen = true">
        <AppIcon name="menu" />
      </button>
      <slot />
    </div>
    </template>
    <div v-if="authUser?.role === 'Internal' && bappNotifications.length" ref="notificationDialog" role="alertdialog" aria-modal="true" aria-labelledby="bapp-notification-title" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" @keydown="onNotificationKeydown">
      <div class="w-full max-w-xl overflow-hidden rounded-theme bg-white shadow-2xl">
        <div class="flex items-start gap-3 border-b border-stone-200 bg-sky-50 px-5 py-5"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-theme bg-sky-700 text-white"><AppIcon name="bell" /></span><div><h2 id="bapp-notification-title" class="text-lg font-semibold text-ink">Terdapat {{ bappNotifications.length }} BAPP baru yang diterapkan untuk anda</h2><p class="mt-1 text-sm text-muted">Daftar sekolah yang baru masuk ke alokasi reviu Anda.</p></div></div>
        <ul class="max-h-72 divide-y divide-stone-100 overflow-y-auto px-5"><li v-for="item in bappNotifications" :key="item.id" class="flex items-start gap-3 py-3"><AppIcon name="school" class="mt-0.5 h-4 w-4 text-sky-700" /><div class="min-w-0"><p class="font-medium text-ink">{{ item.namaSekolah || 'Nama sekolah belum tersedia' }}</p><p class="text-xs text-muted">NPSN {{ item.npsn }} · {{ item.idTransaksi }}</p></div></li></ul>
        <p v-if="notificationError" role="alert" class="px-5 pt-3 text-sm text-red-700">{{ notificationError }}</p>
        <div class="flex flex-wrap justify-end gap-2 border-t border-stone-200 px-5 py-4"><button ref="notificationCloseButton" type="button" :disabled="acknowledgingNotifications" class="rounded-theme border border-stone-300 px-4 py-2 text-sm font-medium disabled:opacity-50" @click="acknowledgeBappNotifications(false)">Tutup</button><button type="button" :disabled="acknowledgingNotifications" class="inline-flex items-center gap-2 rounded-theme bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="acknowledgeBappNotifications(true)">Lihat Cek BAPP<AppIcon name="arrow-right" class="h-4 w-4" /></button></div>
      </div>
    </div>
  </div>
</template>
