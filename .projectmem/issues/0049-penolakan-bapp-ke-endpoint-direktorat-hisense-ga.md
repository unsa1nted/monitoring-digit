# #0049 Penolakan BAPP ke endpoint direktorat Hisense gagal: column a.kode_direktorat does not exist.

- 2026-11-15T10:25:39Z `issue`: Penolakan BAPP ke endpoint direktorat Hisense gagal: column a.kode_direktorat does not exist. [apps/api/src/hisense.ts:61]
- 2026-11-15T10:26:06Z `attempt`: Bandingkan payload aplikasi dengan dokumentasi POST /direktorat/reject; payload sesuai. Error column a.kode_direktorat berasal dari query SQL Hisense, bukan validasi payload lokal. [apps/api/src/hisense.ts:64] (partial)
- 2026-11-15T10:46:27Z `attempt`: POST langsung ke /api/direktorat/reject dengan ID acak yang pasti tidak ada tetap mengembalikan HTTP 400: column a.kode_direktorat does not exist. Membuktikan query endpoint Hisense rusak sebelum transaksi diproses. [apps/api/src/hisense.ts:64] (partial)
- 2026-11-15T10:53:03Z `fix`: Aplikasi tidak lagi memanggil endpoint /direktorat/reject yang mengembalikan error kolom SQL; memakai endpoint alokasi Hisense yang merespons HTTP 404 untuk transaksi uji palsu. [apps/api/src/hisense.ts:61]
