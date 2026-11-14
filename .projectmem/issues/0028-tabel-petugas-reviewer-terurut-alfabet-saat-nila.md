# #0028 Tabel Petugas Reviewer terurut alfabet saat nilai Diterima dan Sudah Diperiksa sama; pengguna minta urutan tertinggi ke terendah.

- 2026-11-13T11:43:03Z `issue`: Tabel Petugas Reviewer terurut alfabet saat nilai Diterima dan Sudah Diperiksa sama; pengguna minta urutan tertinggi ke terendah. [apps/api/src/bapp-review.ts:286]
- 2026-11-13T11:44:26Z `attempt`: Ubah urutan reviewer berdasarkan Alokasi menurun, dengan Diterima, Ditolak, Sudah Diperiksa sebagai tie-breaker. [apps/api/src/bapp-review.ts:284] (worked)
- 2026-11-13T11:44:30Z `fix`: Tabel reviewer menampilkan Alokasi tertinggi dahulu; test-bapp-dashboard, API build, diff check lulus. [apps/api/src/bapp-review.ts:284]
