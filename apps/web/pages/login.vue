<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import kemendikdasmenLogo from '~/assets/logo-kemendikdasmen.png'
const config = useRuntimeConfig()
const route = useRoute()
useHead({ title: 'Login | Dashboard Pemantauan Digitalisasi Pembelajaran SMK' })
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

const login = async () => {
  errorMessage.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { username: username.value, password: password.value },
      credentials: 'include'
    })
    clearNuxtData()
    useState('auth-user').value = null
    await navigateTo('/')
  } catch (error: any) {
    errorMessage.value = error?.data?.message ?? (
      !error?.response || error.response.status >= 500
        ? 'Server login tidak dapat dihubungi. Silakan coba lagi setelah layanan API tersedia.'
        : 'Login gagal. Periksa username dan password.'
    )
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-canvas px-5 py-10 text-ink">
    <section class="w-full max-w-md rounded-theme border border-stone-200 bg-white p-6 shadow-card sm:p-10">
      <div class="relative mb-6 aspect-[4/1] w-full overflow-hidden rounded-theme">
        <img :src="kemendikdasmenLogo" alt="Kemendikdasmen — Direktorat Sekolah Menengah Kejuruan" width="500"
          height="500" class="absolute left-0 top-1/2 h-auto w-full -translate-y-1/2" />
      </div>
      <div class="mb-8 flex items-center gap-3">
        <div>
          <p class="font-semibold tracking-tight">Dashboard Pemantauan Digitalisasi Pembelajaran SMK</p>
        </div>
      </div>
      <div class="mb-7">
        <h1 class="text-2xl font-semibold tracking-tight">Masuk Dashboard</h1>
      </div>
      <form class="space-y-5" @submit.prevent="login">
        <p v-if="route.query.passwordChanged === '1'" role="status"
          class="rounded-theme bg-teal-50 px-4 py-3 text-sm text-teal-800">Password berhasil diubah. Silakan login
          dengan password baru.</p>
        <div><label for="username" class="mb-2 block text-sm font-medium">Username</label><input id="username"
            v-model="username" autocomplete="username" required
            class="w-full rounded-theme border border-stone-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            placeholder="Masukkan username" /></div>
        <div><label for="password" class="mb-2 block text-sm font-medium">Password</label><input id="password"
            v-model="password" type="password" autocomplete="current-password" required
            class="w-full rounded-theme border border-stone-200 px-4 py-3 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            placeholder="Masukkan password" /></div>
        <p v-if="errorMessage" class="rounded-theme bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage }}</p>
        <button type="submit" :disabled="loading"
          class="inline-flex w-full items-center justify-center gap-2 rounded-theme bg-ink px-4 py-3 font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60">
          <AppIcon :name="loading ? 'loading' : 'login'" class="h-4 w-4" :class="{ 'animate-spin': loading }" />{{
            loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </section>
  </main>
</template>
