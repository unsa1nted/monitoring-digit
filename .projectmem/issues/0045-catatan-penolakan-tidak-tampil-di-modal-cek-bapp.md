# #0045 Catatan penolakan tidak tampil di modal Cek BAPP meski Hisense menyediakan catatan_revisi.

- 2026-11-15T09:06:58Z `issue`: Catatan penolakan tidak tampil di modal Cek BAPP meski Hisense menyediakan catatan_revisi. [apps/web/pages/cek-bapp.vue:122]
- 2026-11-15T09:10:42Z `attempt`: Probe read-only Hisense menunjukkan catatan_revisi 45 karakter pada status INSTALASI SELESAI; tampilan kini bergantung langsung pada field tersebut. [apps/web/pages/cek-bapp.vue:122] (worked)
- 2026-11-15T09:10:50Z `fix`: Kotak catatan merah pada modal kini muncul saat detail Hisense catatan_revisi terisi, tanpa syarat status; probe API, parser Vue, build web, diff check lulus. [apps/web/pages/cek-bapp.vue:122]
