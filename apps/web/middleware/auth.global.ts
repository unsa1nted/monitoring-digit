export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const config = useRuntimeConfig()
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const result = await $fetch<{ user: { id: number; username: string; role: 'Admin' | 'Dinas' | 'Internal'; province: string | null } }>('/api/auth/me', {
    baseURL: config.public.apiBase,
    credentials: 'include',
    headers
  }).catch(() => null)

  if (!result?.user) {
    useState('auth-user').value = null
    clearNuxtData()
    return navigateTo('/login')
  }
  useState('auth-user').value = result.user
  if (result.user.role === 'Internal') {
    if (!['/', '/bapp-fisik', '/cek-bapp', '/rekap-scan'].includes(to.path)) return navigateTo('/', { replace: true })
    return
  }
  if (to.path === '/bapp-fisik' || to.path === '/cek-bapp') return navigateTo('/')
  if (to.path === '/rekap-scan' && result.user.role !== 'Admin') return navigateTo('/')
  if (to.path === '/assign-npsn-bapp' && result.user.role !== 'Admin') return navigateTo('/')
  if (to.path === '/users' && result.user.role !== 'Admin') return navigateTo('/')
})
