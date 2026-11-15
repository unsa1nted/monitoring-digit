# #0047 Kotak catatan tetap tidak tampil di modal Reviu BAPP walau status Sedang Ditolak terlihat; periksa perbedaan data list dan detail Hisense.

- 2026-11-15T09:28:44Z `issue`: Kotak catatan tetap tidak tampil di modal Reviu BAPP walau status Sedang Ditolak terlihat; periksa perbedaan data list dan detail Hisense. [apps/web/pages/cek-bapp.vue:516]
- 2026-11-15T09:30:49Z `attempt`: Probe read-only lima transaksi revisi: Hisense direct dan search sama-sama berisi catatan_revisi; endpoint detail kini bypass cache, kotak merah dirender untuk status ditolak/revisi. [apps/web/pages/cek-bapp.vue:519] (worked)
- 2026-11-15T09:30:55Z `fix`: Catatan di modal selalu tampil tepat di bawah Sedang Ditolak/Revisi Tersedia, mengambil catatan_revisi terbaru Hisense dan menampilkan pesan jika kosong; build API/web dan diff check lulus. [apps/web/pages/cek-bapp.vue:519]
