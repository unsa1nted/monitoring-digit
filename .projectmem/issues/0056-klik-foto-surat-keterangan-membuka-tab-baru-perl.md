# #0056 Klik foto surat keterangan membuka tab baru; perlu pratinjau membesar di modal yang sama

- 2026-11-16T06:14:22Z `issue`: Klik foto surat keterangan membuka tab baru; perlu pratinjau membesar di modal yang sama [apps/web/pages/cek-bapp.vue:578]
- 2026-11-16T06:16:24Z `attempt`: Ganti tautan foto suket dengan tombol yang membuka pratinjau layar penuh di modal reviu; Escape menutup dan fokus kembali [apps/web/pages/cek-bapp.vue:580] (partial)
- 2026-11-16T06:18:07Z `fix`: Foto suket kini dibuka sebagai pratinjau dalam modal reviu; tombol Tutup/Escape kembali ke foto, build web dan diff check lulus [apps/web/pages/cek-bapp.vue:582]
