export default defineNuxtConfig({
  devServer: { port: 3001 },
  devtools: { enabled: true },
  app: {
    head: {
      titleTemplate: '%s',
      meta: [{ name: 'description', content: 'Monitoring Digit system observability dashboard' }]
    }
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    apiUpstream: 'http://127.0.0.1:4001',
    public: { apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '' }
  },
  typescript: { strict: true, typeCheck: false }
})
