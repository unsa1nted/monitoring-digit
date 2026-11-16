# #0060 Halaman daftar dan detail Hisense masih memanggil API saat dibuka walau timer sinkron sudah dihapus

- 2026-11-16T12:40:26Z `issue`: Halaman daftar dan detail Hisense masih memanggil API saat dibuka walau timer sinkron sudah dihapus [apps/web/pages/hisense.vue:19]
- 2026-11-16T12:42:54Z `attempt`: Nonaktifkan useFetch otomatis pada daftar dan detail Hisense; tombol Cari data dan Muat detail memicu request [apps/web/pages/hisense.vue:19] (worked)
- 2026-11-16T12:42:57Z `fix`: Halaman daftar/detail Hisense tidak lagi memanggil API saat dibuka; tombol manual memicu permintaan. Build web dan git diff --check lulus. [apps/web/pages/hisense.vue:19]
