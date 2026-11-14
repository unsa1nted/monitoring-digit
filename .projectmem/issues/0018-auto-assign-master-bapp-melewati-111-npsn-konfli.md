# #0018 Auto assign master_bapp melewati 111 NPSN konflik, 126 reviewer tidak terdaftar, dan 69 data tidak valid tanpa rincian yang bisa diperiksa admin.

- 2026-11-13T09:06:50Z `issue`: Auto assign master_bapp melewati 111 NPSN konflik, 126 reviewer tidak terdaftar, dan 69 data tidak valid tanpa rincian yang bisa diperiksa admin. [apps/api/src/bapp-review.ts:45]
- 2026-11-13T09:10:58Z `attempt`: Tambahkan pratinjau admin tanpa tulis DB berisi NPSN, alasan, petugas, dan ID transaksi sumber untuk setiap baris auto assign yang dilewati. [apps/web/pages/assign-npsn-bapp.vue] (partial)
- 2026-11-13T09:11:49Z `fix`: Pratinjau auto assign menampilkan tiap NPSN dilewati beserta alasan, petugas_reviu, dan transaksi; query DB menjelaskan 111 konflik, 126 aprilia tidak terdaftar, 69 username tidak valid. Build API/web dan tes lulus. [apps/web/pages/assign-npsn-bapp.vue:121]
