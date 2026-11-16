# #0058 Investigasi jumlah permintaan API Hisense tinggi; identifikasi jalur dan frekuensi panggilan dari aplikasi

- 2026-11-16T08:47:12Z `issue`: Investigasi jumlah permintaan API Hisense tinggi; identifikasi jalur dan frekuensi panggilan dari aplikasi [apps/api/src/hisense.ts]
- 2026-11-16T08:50:41Z `attempt`: Audit alur: scheduler revisi tiap 60 detik melakukan GET per BAPP REVISI/Tidak Sesuai dengan bypassCache; statistik provinsi dan filter Dinas juga memindai semua halaman Hisense [apps/api/src/bapp-review.ts:290] (partial)
- 2026-11-16T08:56:43Z `attempt`: Hapus scheduler revisi per-ID tiap 60 detik; deteksi revisi dan notifikasi tetap melalui import Excel otomatis 10 menit [apps/api/src/bapp-review.ts:285] (partial)
- 2026-11-16T08:57:25Z `attempt`: Build API dan diff check lulus; scheduler GET per-ID revisi dihapus, import Excel 10 menit tetap mendeteksi transisi ke INSTALASI SELESAI dan membuat notifikasi [apps/api/src/bapp-review.ts:201] (worked)
