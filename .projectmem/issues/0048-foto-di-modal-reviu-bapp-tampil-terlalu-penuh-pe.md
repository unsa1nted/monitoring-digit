# #0048 Foto di modal reviu BAPP tampil terlalu penuh; perlu ukuran awal yang fit dan tetap mendukung zoom.

- 2026-11-15T09:47:30Z `issue`: Foto di modal reviu BAPP tampil terlalu penuh; perlu ukuran awal yang fit dan tetap mendukung zoom. [apps/web/pages/cek-bapp.vue:430]
- 2026-11-15T09:49:11Z `attempt`: Beri ruang di viewer dan batasi ukuran awal foto 840x560 px, tetap object-contain dan skala zoom; parser Vue, build web, diff check lulus. [apps/web/pages/cek-bapp.vue:432] (worked)
- 2026-11-15T09:49:16Z `fix`: Foto modal Reviu BAPP tampil fit, tengah, proporsional dengan ruang tepi dan batas 840x560 px pada zoom 100%; zoom dan layar penuh tetap tersedia. [apps/web/pages/cek-bapp.vue:432]
