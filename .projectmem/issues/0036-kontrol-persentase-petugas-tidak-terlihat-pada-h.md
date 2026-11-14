# #0036 Kontrol persentase petugas tidak terlihat pada halaman Kelola BAPP

- 2026-11-14T08:28:14Z `issue`: Kontrol persentase petugas tidak terlihat pada halaman Kelola BAPP [apps/web/pages/assign-npsn-bapp.vue:135]
- 2026-11-14T08:29:08Z `attempt`: Pemeriksaan database: 39 petugas reviewer ada, tetapi kolom alokasi_persen belum ada; migrasi 0018 belum dijalankan [apps/api/drizzle/0018_giant_alex_power.sql:1] (partial)
- 2026-11-14T08:29:34Z `attempt`: Menjalankan migrasi 0018 untuk menambah petugas_reviewer.alokasi_persen [apps/api/drizzle/0018_giant_alex_power.sql:1] (worked)
- 2026-11-14T08:29:38Z `fix`: Migrasi 0018 diterapkan; query petugas reviewer kini berhasil memuat 39 baris dengan alokasi_persen NULL [apps/api/drizzle/0018_giant_alex_power.sql:1]
