# #0027 Ringkasan BAPP dan dashboard gagal memuat kartu serta tabel petugas meski master_bapp tersedia.

- 2026-11-13T11:06:25Z `issue`: Ringkasan BAPP dan dashboard gagal memuat kartu serta tabel petugas meski master_bapp tersedia. [apps/api/src/bapp-review.ts]
- 2026-11-13T11:08:19Z `attempt`: Tambahkan /api/bapp-dashboard ke pengecualian guard Internal global; endpoint sendiri tetap memeriksa login dan role. [apps/api/src/index.ts:28] (worked)
- 2026-11-13T11:08:23Z `fix`: Ringkasan dan tabel reviewer kembali dapat diakses Internal; semua query loadBappDashboard memakai master_bapp, assignment, petugas_reviewer lokal. API build, test-bapp-dashboard, respons endpoint 401 tanpa login, diff check lulus. [apps/api/src/index.ts:28]
