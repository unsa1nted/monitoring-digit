# #0064 Sinkron Hisense langsung membagikan BAPP baru ke petugas; perlu antrean alokasi manual dan tombol bagikan merata.

- 2026-11-22T09:37:31Z `issue`: Sinkron Hisense langsung membagikan BAPP baru ke petugas; perlu antrean alokasi manual dan tombol bagikan merata. [apps/api/src/bapp-review.ts:201]
- 2026-11-22T09:44:04Z `attempt`: Ubah sinkron API agar transaksi baru menunggu alokasi, tambah endpoint pembagian dan modal jumlah per petugas; build API/web lulus. [apps/api/src/bapp-review.ts:421] (worked)
- 2026-11-22T09:48:03Z `fix`: Sinkron API Hisense menyimpan BAPP baru tanpa petugas; admin membagi jumlah per petugas atau merata lewat modal. Test distribusi, build API/web, diff --check lulus. [apps/api/src/bapp-review.ts:428]
