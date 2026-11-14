# #0041 Impor BAPP gagal saat belum ada petugas reviewer karena notifikasi dibuat tanpa alokasi.

- 2026-11-14T10:20:43Z `issue`: Impor BAPP gagal saat belum ada petugas reviewer karena notifikasi dibuat tanpa alokasi. [apps/api/src/bapp-review.ts:206]
- 2026-11-14T10:21:18Z `attempt`: Filter baris notifikasi ke transaksi yang benar-benar mendapat alokasi; build API dan diff check lulus. [apps/api/src/bapp-review.ts:206] (worked)
- 2026-11-14T10:21:22Z `fix`: Notifikasi BAPP dibuat hanya untuk transaksi baru yang mendapat petugas; build API dan diff check lulus. [apps/api/src/bapp-review.ts:206]
