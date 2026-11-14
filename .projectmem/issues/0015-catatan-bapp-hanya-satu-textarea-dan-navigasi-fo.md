# #0015 Catatan BAPP hanya satu textarea dan navigasi foto mengizinkan hasil Tidak Sesuai tanpa catatan per foto.

- 2026-11-13T08:03:20Z `issue`: Catatan BAPP hanya satu textarea dan navigasi foto mengizinkan hasil Tidak Sesuai tanpa catatan per foto. [apps/web/pages/cek-bapp.vue:95]
- 2026-11-13T08:05:35Z `attempt`: Pindahkan catatan ke foto Tidak Sesuai, batasi navigasi sampai catatan terisi, gabungkan catatan saat simpan, dan pulihkan catatan tersimpan. [apps/web/pages/cek-bapp.vue] (partial)
- 2026-11-13T08:06:34Z `fix`: Catatan per foto Tidak Sesuai wajib sebelum navigasi/simpan; gabungan tersimpan di catatanPetugas. Build web dan uji format catatan lulus. [apps/web/pages/cek-bapp.vue:109]
