# #0059 Admin memerlukan kontrol Start/Stop untuk sinkron Excel Hisense otomatis setiap 10 menit

- 2026-11-16T12:18:23Z `issue`: Admin memerlukan kontrol Start/Stop untuk sinkron Excel Hisense otomatis setiap 10 menit [apps/api/src/index.ts]
- 2026-11-16T12:26:14Z `attempt`: Menghapus scheduler sinkron Excel Hisense 10 menit; sinkron tetap tersedia lewat POST admin manual [apps/api/src/index.ts] (partial)
- 2026-11-16T12:37:54Z `attempt`: Hapus timer Excel dan worker validasi Hisense; pindah validasi scan serta hitung sekolah ke tombol manual, statistik dashboard hanya dimuat lewat tombol [apps/api/src/index.ts] (worked)
- 2026-11-16T12:38:01Z `fix`: Sinkron Excel Hisense hanya POST manual admin; scan, jumlah BAPP, statistik provinsi memakai tombol manual. Build API/web dan git diff --check lulus. [apps/api/src/index.ts]
