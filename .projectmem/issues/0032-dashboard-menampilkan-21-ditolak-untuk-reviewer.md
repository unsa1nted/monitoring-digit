# #0032 Dashboard menampilkan 21 Ditolak untuk reviewer rai meski tidak ada status_progress REVISI; perlu telusuri sumber hasil_akhir_reviu.

- 2026-11-13T13:28:10Z `issue`: Dashboard menampilkan 21 Ditolak untuk reviewer rai meski tidak ada status_progress REVISI; perlu telusuri sumber hasil_akhir_reviu. [apps/api/src/bapp-review.ts:331]
- 2026-11-13T13:29:16Z `attempt`: Query master_bapp untuk rai: 21 hasil_akhir_reviu Tidak Sesuai, status 17 INSTALASI SELESAI dan 4 DISETUJUI, 0 REVISI; semua 21 punya minimal satu foto Tidak. [apps/api/src/bapp-review.ts:331] (worked)
- 2026-11-13T13:29:23Z `fix`: Angka Ditolak rai terjelaskan: dashboard memakai hasil_akhir_reviu Tidak Sesuai OR status_progress REVISI. Seluruh 21 berasal dari hasil foto Tidak, tanpa status REVISI; tidak ada perubahan kode/data. [apps/api/src/bapp-review.ts:331]
