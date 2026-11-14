# #0019 Admin belum dapat sinkronkan master_bapp.petugas_reviu dari approved_by_moe Hisense berdasarkan id_transaksi.

- 2026-11-13T09:18:16Z `issue`: Admin belum dapat sinkronkan master_bapp.petugas_reviu dari approved_by_moe Hisense berdasarkan id_transaksi. [apps/api/src/bapp-review.ts]
- 2026-11-13T09:20:20Z `attempt`: Tambah tombol Ambil Data Petugas; scan halaman Hisense, cocokkan id_transaksi, update petugas_reviu hanya bila approved_by_moe ada dan valid, serta laporkan hasil. [apps/api/src/bapp-review.ts] (partial)
- 2026-11-13T09:21:25Z `fix`: Admin memiliki tombol Ambil Data Petugas yang memperbarui master_bapp.petugas_reviu dari Hisense approved_by_moe melalui id_transaksi; nilai kosong/tidak ditemukan dilewati. Build API/web dan tes koleksi lulus. [apps/web/pages/assign-npsn-bapp.vue]
