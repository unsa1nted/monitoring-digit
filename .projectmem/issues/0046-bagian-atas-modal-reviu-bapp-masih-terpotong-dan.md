# #0046 Bagian atas modal reviu BAPP masih terpotong dan modal tidak memenuhi layar setelah perbaikan overflow.

- 2026-11-15T09:11:05Z `issue`: Bagian atas modal reviu BAPP masih terpotong dan modal tidak memenuhi layar setelah perbaikan overflow. [apps/web/pages/cek-bapp.vue:375]
- 2026-11-15T09:14:22Z `attempt`: Hilangkan margin atas 24 px dari selector space-y-6 pada modal fixed memakai inline margin-top:0; build web dan parser Vue lulus. [apps/web/pages/cek-bapp.vue:379] (worked)
- 2026-11-15T09:14:29Z `fix`: Modal reviu fixed kembali mulai tepat di atas viewport karena margin-top dari parent space-y-6 dinolkan; build web, parser Vue, diff check lulus. [apps/web/pages/cek-bapp.vue:379]
