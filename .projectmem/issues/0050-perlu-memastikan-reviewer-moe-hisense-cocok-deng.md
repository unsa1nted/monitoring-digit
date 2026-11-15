# #0050 Perlu memastikan Reviewer MOE Hisense cocok dengan petugas yang menyetujui, serta menyimpan riwayat sinkron Excel otomatis dengan waktu dan jumlah alokasi per petugas.

- 2026-11-15T10:29:12Z `issue`: Perlu memastikan Reviewer MOE Hisense cocok dengan petugas yang menyetujui, serta menyimpan riwayat sinkron Excel otomatis dengan waktu dan jumlah alokasi per petugas. [apps/api/src/bapp-review.ts]
- 2026-11-15T10:35:09Z `attempt`: Uji riwayat sinkron pertama gagal karena fixture Excel belum memuat header wajib Propinsi, Kabupaten/Kota, Kecamatan, Reviewer MOE, Reviewer MOE Revisi. [apps/api/scripts/test-bapp-sync-history.ts:18] (failed)
- 2026-11-15T10:38:55Z `attempt`: Tambah tabel riwayat sinkron, simpan snapshot jumlah BAPP per petugas dalam transaksi impor, tampilkan tanggal WIB dan detail expandable; uji impor baru/ulang, build API/web lulus. [apps/api/src/bapp-review.ts:184] (worked)
- 2026-11-15T10:39:01Z `fix`: Riwayat sinkron Hisense otomatis/manual kini tersimpan dengan waktu dan jumlah alokasi per petugas; `reviewer_name` approve tetap username login. Build, uji distribusi dan uji request Hisense lulus. [apps/web/pages/assign-npsn-bapp.vue:156]
