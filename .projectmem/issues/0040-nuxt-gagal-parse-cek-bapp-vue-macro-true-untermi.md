# #0040 Nuxt gagal parse cek-bapp.vue?macro=true: Unterminated string constant setelah perapian UI

- 2026-11-14T09:21:06Z `issue`: Nuxt gagal parse cek-bapp.vue?macro=true: Unterminated string constant setelah perapian UI [apps/web/pages/cek-bapp.vue]
- 2026-11-14T09:25:30Z `attempt`: Mengganti tiga ekspresi ternary template yang berisi string terpotong dengan v-if/template; parser Vue 0 error dan build web lulus [apps/web/pages/cek-bapp.vue:523] (worked)
- 2026-11-14T09:25:36Z `fix`: Error Unterminated string constant pada cek-bapp.vue?macro=true hilang; compileTemplate dan build web lulus [apps/web/pages/cek-bapp.vue:523]
