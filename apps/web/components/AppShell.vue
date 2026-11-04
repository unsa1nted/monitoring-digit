<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
const authUser = useState<{ username: string; role: 'Admin' | 'Dinas' | 'Internal'; province: string | null } | null>('auth-user')
const route = useRoute()
const sidebarOpen = ref(false)
const config = useRuntimeConfig()
const loggingOut = ref(false)
const logoutError = ref('')
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
        <NuxtLink v-if="authUser?.role === 'Internal'" to="/bapp-fisik" :class="navClass('/bapp-fisik')" @click="sidebarOpen = false">
          <span class="w-5 text-center text-sky-500"><AppIcon name="school" /></span>Bapp Fisik
        </NuxtLink>
        <NuxtLink v-if="authUser?.role !== 'Internal'" to="/" :class="navClass('/')" @click="sidebarOpen = false"><span class="w-5 text-center text-sky-500">
            <AppIcon name="home" />
          </span>Dashboard</NuxtLink>
        <NuxtLink v-if="authUser?.role !== 'Internal'" to="/hisense" :class="navClass('/hisense')" @click="sidebarOpen = false"><span
            class="w-5 text-center text-sky-500">
            <AppIcon name="truck" />
          </span>Data Hisense</NuxtLink>
        <NuxtLink v-if="authUser?.role === 'Admin' || authUser?.role === 'Internal'" to="/rekap-scan" :class="navClass('/rekap-scan')" @click="sidebarOpen = false">
          <span class="w-5 text-center text-sky-500"><AppIcon name="chart" /></span>Rekap Scan BAPP
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
  </div>
</template>
