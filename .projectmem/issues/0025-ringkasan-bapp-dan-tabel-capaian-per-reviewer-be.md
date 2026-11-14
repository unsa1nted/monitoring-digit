# #0025 Ringkasan BAPP dan tabel capaian per reviewer belum tersedia di Cek BAPP maupun dashboard utama admin/internal.

- 2026-11-13T10:31:41Z `issue`: Ringkasan BAPP dan tabel capaian per reviewer belum tersedia di Cek BAPP maupun dashboard utama admin/internal. [apps/web/pages/cek-bapp.vue]
- 2026-11-13T10:41:01Z `attempt`: Tambah agregasi BAPP per akun/global, kartu ringkasan sebelum tabel Cek BAPP, dashboard utama Admin/Internal, dan tabel reviewer diurutkan Diterima lalu Sudah Diperiksa. [apps/api/src/bapp-review.ts] (partial)
- 2026-11-13T10:52:23Z `fix`: Kartu ringkasan BAPP tampil sebelum tabel Cek BAPP dan pada dashboard Admin/Internal; dashboard memuat tabel reviewer terurut. Build API/web, tes agregasi DB dan diff check lulus. [apps/web/pages/index.vue]
