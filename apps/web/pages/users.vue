<script setup lang="ts">
type User = { id: number; username: string; role: 'Admin' | 'Dinas' | 'Internal'; province: string | null }
useHead({ title: 'Kelola User | Dashboard Pemantauan Digitalisasi Pembelajaran SMK' })
const config = useRuntimeConfig()
const authUser = useState<User | null>('auth-user')
const { data, pending, error, refresh } = await useFetch<{ data: User[]; reviewers: string[]; provinces: string[] }>('/api/admin/users', {
  baseURL: config.public.apiBase, credentials: 'include',
  headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined
})
const search = ref('')
const selectedReviewers = reactive<Record<number, string>>({})
const savingReviewers = ref(false)
const reviewerError = ref('')
const reviewerNames = computed(() => new Set((data.value?.reviewers ?? []).map(name => name.toLowerCase())))
const reviewerUsers = computed(() => (data.value?.data ?? []).filter(user => user.role === 'Internal' && reviewerNames.value.has(user.username.toLowerCase())))
const selectedCount = computed(() => Object.keys(selectedReviewers).length)
const filteredUsers = computed(() => (data.value?.data ?? []).filter(user =>
  `${user.username} ${user.role} ${user.province ?? ''}`.toLowerCase().includes(search.value.toLowerCase())
))
const form = reactive({ username: '', role: 'Dinas' as User['role'], province: '', password: '', confirmation: '' })
const selectedUser = ref<User | null>(null)
const newPassword = ref('')
const confirmation = ref('')
const saving = ref(false)
const resetting = ref(false)
const createError = ref('')
const resetError = ref('')
const success = ref('')
const passwordInput = ref<HTMLInputElement | null>(null)
const inputClass = 'w-full rounded-theme border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100'

function message(error: any) {
  if (error?.statusCode === 422) return 'Periksa isian. Password harus 8–128 karakter.'
  return error?.data?.message ?? 'Permintaan gagal. Periksa koneksi lalu coba lagi.'
}
async function createUser() {
  if (saving.value) return
  createError.value = ''
  success.value = ''
  if (form.password !== form.confirmation) { createError.value = 'Konfirmasi password tidak sama.'; return }
  saving.value = true
  try {
    await $fetch('/api/admin/users', {
      baseURL: config.public.apiBase, credentials: 'include', method: 'POST',
      body: { username: form.username.trim(), role: form.role, province: form.role === 'Dinas' ? form.province : undefined, password: form.password }
    })
    success.value = `User ${form.username.trim()} berhasil ditambahkan.`
    Object.assign(form, { username: '', role: 'Dinas', province: '', password: '', confirmation: '' })
    await refresh()
  } catch (error) { createError.value = message(error) }
  finally { saving.value = false }
}
async function selectUser(user: User) {
  selectedUser.value = user
  newPassword.value = ''
  confirmation.value = ''
  resetError.value = ''
  success.value = ''
  await nextTick()
  passwordInput.value?.focus()
}
async function changePassword() {
  if (!selectedUser.value || resetting.value) return
  resetError.value = ''
  success.value = ''
  if (newPassword.value !== confirmation.value) { resetError.value = 'Konfirmasi password tidak sama.'; return }
  resetting.value = true
  try {
    const target = selectedUser.value
    await $fetch(`/api/admin/users/${target.id}/password`, {
      baseURL: config.public.apiBase, credentials: 'include', method: 'PATCH', body: { password: newPassword.value }
    })
    newPassword.value = ''
    confirmation.value = ''
    selectedUser.value = null
    if (target.id === authUser.value?.id) {
      authUser.value = null
      clearNuxtData()
      await navigateTo('/login?passwordChanged=1', { replace: true })
    } else {
      success.value = `Password ${target.username} berhasil diubah. User tersebut harus login kembali.`
    }
  } catch (error) { resetError.value = message(error) }
  finally { resetting.value = false }
}
async function saveReviewerPasswords() {
  if (savingReviewers.value || !selectedCount.value) return
  reviewerError.value = ''
  success.value = ''
  const updates = Object.entries(selectedReviewers).map(([id, password]) => ({ id: Number(id), password }))
  if (updates.some(update => update.password.length < 8 || update.password.length > 128)) { reviewerError.value = 'Isi password Hisense 8–128 karakter untuk setiap petugas terpilih.'; return }
  savingReviewers.value = true
  try {
    await $fetch('/api/admin/users/batch-passwords', { baseURL: config.public.apiBase, credentials: 'include', method: 'PATCH', body: { updates } })
    for (const id of Object.keys(selectedReviewers)) delete selectedReviewers[Number(id)]
    success.value = `Password ${updates.length} petugas berhasil disamakan dengan Hisense. Petugas harus login kembali.`
  } catch (error) { reviewerError.value = message(error) }
  finally { savingReviewers.value = false }
}
</script>

<template>
  <AppShell>
    <header class="border-b border-stone-200 bg-white px-5 pb-6 pt-20 sm:px-8 lg:pt-6">
      <div class="mx-auto max-w-[1400px]">
        <h1 class="text-2xl font-semibold">Kelola User</h1>
        <p class="mt-2 text-sm text-muted">Tambah akun Admin, Dinas, atau Internal dan ubah password seluruh user.</p>
      </div>
    </header>
    <main class="mx-auto max-w-[1400px] space-y-6 px-5 py-8 sm:px-8">
      <p v-if="success" role="status" class="rounded-theme bg-teal-50 p-4 text-sm text-teal-800">{{ success }}</p>
      <div class="grid gap-6 xl:grid-cols-2">
        <section class="rounded-theme border border-stone-200 bg-white p-6 shadow-card">
          <h2 class="text-lg font-semibold">Tambah User</h2>
          <form class="mt-5 space-y-4" @submit.prevent="createUser">
            <fieldset :disabled="saving" class="space-y-4 disabled:opacity-60">
              <div><label for="new-username" class="mb-2 block text-sm font-medium">Username</label><input id="new-username" v-model="form.username" :class="inputClass" required minlength="3" maxlength="80" pattern="[a-zA-Z0-9_.\-]{3,80}" autocomplete="off" /><p class="mt-1 text-xs text-muted">3–80 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.</p></div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div><label for="new-role" class="mb-2 block text-sm font-medium">Role</label><select id="new-role" v-model="form.role" :class="inputClass"><option>Dinas</option><option>Admin</option><option>Internal</option></select></div>
                <div v-if="form.role === 'Dinas'"><label for="new-province" class="mb-2 block text-sm font-medium">Provinsi</label><select id="new-province" v-model="form.province" required :class="inputClass"><option disabled value="">Pilih provinsi</option><option v-for="province in data?.provinces ?? []" :key="province" :value="province">{{ province }}</option></select></div>
              </div>
              <div><label for="new-password" class="mb-2 block text-sm font-medium">Password</label><input id="new-password" v-model="form.password" type="password" required minlength="8" maxlength="128" autocomplete="new-password" :class="inputClass" /><p class="mt-1 text-xs text-muted">Gunakan 8–128 karakter.</p></div>
              <div><label for="new-confirmation" class="mb-2 block text-sm font-medium">Konfirmasi password</label><input id="new-confirmation" v-model="form.confirmation" type="password" required minlength="8" maxlength="128" autocomplete="new-password" :class="inputClass" /></div>
              <p v-if="createError" role="alert" class="text-sm text-red-700">{{ createError }}</p>
              <button type="submit" class="rounded-theme bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" :disabled="saving || pending || !!error">{{ saving ? 'Menyimpan…' : 'Tambah User' }}</button>
            </fieldset>
          </form>
        </section>
        <section class="rounded-theme border border-stone-200 bg-white p-6 shadow-card">
          <h2 class="text-lg font-semibold">Ubah Password</h2>
          <p v-if="!selectedUser" class="mt-4 text-sm text-muted">Pilih tombol Ubah Password pada daftar user di bawah.</p>
          <form v-else class="mt-5 space-y-4" @submit.prevent="changePassword">
            <p class="rounded-theme bg-sky-50 p-3 text-sm text-sky-800">Akun: <strong>{{ selectedUser.username }}</strong> · {{ selectedUser.role }}</p>
            <p class="text-sm text-muted">Sesi lama akun ini akan berakhir. {{ selectedUser.id === authUser?.id ? 'Anda akan diarahkan ke halaman login setelah menyimpan.' : 'User harus login kembali dengan password baru.' }}</p>
            <fieldset :disabled="resetting" class="space-y-4 disabled:opacity-60">
              <div><label for="reset-password" class="mb-2 block text-sm font-medium">Password baru</label><input id="reset-password" ref="passwordInput" v-model="newPassword" type="password" required minlength="8" maxlength="128" autocomplete="new-password" :class="inputClass" /><p class="mt-1 text-xs text-muted">Gunakan 8–128 karakter.</p></div>
              <div><label for="reset-confirmation" class="mb-2 block text-sm font-medium">Konfirmasi password baru</label><input id="reset-confirmation" v-model="confirmation" type="password" required minlength="8" maxlength="128" autocomplete="new-password" :class="inputClass" /></div>
              <p v-if="resetError" role="alert" class="text-sm text-red-700">{{ resetError }}</p>
              <div class="flex gap-3"><button type="submit" class="rounded-theme bg-ink px-4 py-2.5 text-sm font-medium text-white">{{ resetting ? 'Menyimpan…' : 'Simpan Password' }}</button><button type="button" class="rounded-theme border border-stone-300 px-4 py-2.5 text-sm" @click="selectedUser = null; newPassword = ''; confirmation = ''">Batal</button></div>
            </fieldset>
          </form>
        </section>
      </div>
      <section class="rounded-theme border border-stone-200 bg-white p-6 shadow-card">
        <h2 class="text-lg font-semibold">Samakan Password Petugas dengan Hisense</h2>
        <p class="mt-2 text-sm text-muted">Pilih maksimal 20 petugas, lalu isi password Hisense masing-masing. Password diverifikasi ke Hisense sebelum password aplikasi diubah. Semua sesi lama petugas akan berakhir.</p>
        <form class="mt-5 space-y-4" @submit.prevent="saveReviewerPasswords">
          <div class="grid gap-3 sm:grid-cols-2">
            <div v-for="user in reviewerUsers" :key="user.id" class="rounded-theme border border-stone-200 p-3">
              <label class="flex items-center gap-2 text-sm font-medium"><input type="checkbox" :checked="user.id in selectedReviewers" :disabled="savingReviewers || (selectedCount >= 20 && !(user.id in selectedReviewers))" @change="($event.target as HTMLInputElement).checked ? selectedReviewers[user.id] = '' : delete selectedReviewers[user.id]">{{ user.username }}</label>
              <label v-if="user.id in selectedReviewers" :for="`hisense-password-${user.id}`" class="mt-3 block text-xs text-muted">Password Hisense {{ user.username }}</label>
              <input v-if="user.id in selectedReviewers" :id="`hisense-password-${user.id}`" v-model="selectedReviewers[user.id]" type="password" autocomplete="new-password" minlength="8" maxlength="128" required :disabled="savingReviewers" :class="inputClass" class="mt-1">
            </div>
          </div>
          <p v-if="!reviewerUsers.length" class="text-sm text-muted">Belum ada akun Internal yang terdaftar sebagai petugas reviewer.</p>
          <p v-if="reviewerError" role="alert" class="text-sm text-red-700">{{ reviewerError }}</p>
          <button type="submit" :disabled="!selectedCount || savingReviewers" class="rounded-theme bg-ink px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{{ savingReviewers ? 'Memverifikasi…' : `Simpan Password ${selectedCount} Petugas` }}</button>
        </form>
      </section>
      <section class="overflow-hidden rounded-theme border border-stone-200 bg-white shadow-card">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 p-6">
          <h2 class="text-lg font-semibold">Daftar User <span class="text-sm font-normal text-muted">({{ filteredUsers.length }})</span></h2>
          <div><label for="user-search" class="sr-only">Cari username, role, atau provinsi</label><input id="user-search" v-model="search" type="search" placeholder="Cari user / provinsi…" :class="inputClass" /></div>
        </div>
        <p v-if="pending" role="status" class="p-6 text-sm text-muted">Memuat user…</p>
        <div v-else-if="error" role="alert" class="p-6 text-sm text-red-700">Daftar user gagal dimuat. <button class="underline" @click="refresh()">Coba lagi</button></div>
        <p v-else-if="!filteredUsers.length" class="p-6 text-sm text-muted">Tidak ada user yang cocok.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-stone-50 text-muted"><tr><th scope="col" class="px-6 py-4">Username</th><th scope="col" class="px-6 py-4">Role</th><th scope="col" class="px-6 py-4">Provinsi</th><th scope="col" class="px-6 py-4">Aksi</th></tr></thead>
            <tbody class="divide-y divide-stone-100"><tr v-for="user in filteredUsers" :key="user.id"><td class="px-6 py-4 font-medium">{{ user.username }} <span v-if="user.id === authUser?.id" class="text-xs text-sky-600">(Anda)</span></td><td class="px-6 py-4">{{ user.role }}</td><td class="px-6 py-4">{{ user.province || 'Semua provinsi' }}</td><td class="px-6 py-4"><button type="button" :disabled="resetting" class="whitespace-nowrap rounded-theme border border-sky-200 px-3 py-2 font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50" :aria-label="`Ubah password ${user.username}`" @click="selectUser(user)">Ubah Password</button></td></tr></tbody>
          </table>
        </div>
      </section>
    </main>
  </AppShell>
</template>
