# #0057 Pindah otomatis ke transaksi BAPP berikutnya membuat foto gagal dimuat sampai modal ditutup dan dibuka ulang

- 2026-11-16T07:11:34Z `issue`: Pindah otomatis ke transaksi BAPP berikutnya membuat foto gagal dimuat sampai modal ditutup dan dibuka ulang [apps/web/pages/cek-bapp.vue:359]
- 2026-11-16T07:14:09Z `attempt`: Paksa modal unmount sebelum transaksi berikutnya; kunci gambar per ID transaksi dan selesaikan loading saat gambar cache sudah complete; abaikan event gambar lama [apps/web/pages/cek-bapp.vue:130] (partial)
- 2026-11-16T07:15:49Z `fix`: Transisi ke BAPP berikutnya menunggu modal lama unmount; gambar dikunci per ID dan status load diverifikasi termasuk cache; build web serta diff check lulus [apps/web/pages/cek-bapp.vue:382]
