# #0037 Alur Simpan Reviu BAPP perlu approve/reject Hisense dengan alasan penolakan multiselect dan konfirmasi

- 2026-11-14T08:43:56Z `issue`: Alur Simpan Reviu BAPP perlu approve/reject Hisense dengan alasan penolakan multiselect dan konfirmasi [apps/web/pages/cek-bapp.vue]
- 2026-11-14T08:46:30Z `attempt`: Frontend Hisense menunjukkan PUT /hi-transaksi/alokasi/review/:id; approve DISETUJUI, reject REVISI dengan tag_revisi dan catatan_revisi [apps/api/src/hisense.ts] (partial)
- 2026-11-14T08:53:08Z `attempt`: Tombol Disetujui/Ditolak dan popup, validasi alasan, PUT review Hisense dengan token admin otomatis; build API/web dan tes mock lulus [apps/api/src/bapp-review.ts:528] (worked)
- 2026-11-14T08:53:13Z `fix`: Reviu BAPP kini meminta konfirmasi setuju atau pilihan alasan jamak dan catatan sebelum mengirim approve/reject ke Hisense; data lokal diperbarui setelah Hisense berhasil [apps/web/pages/cek-bapp.vue:299]
