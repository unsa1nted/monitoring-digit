# #0017 Admin belum dapat mengisi assignment NPSN otomatis dari pasangan npsn dan petugas_reviu pada master_bapp.

- 2026-11-13T08:45:12Z `issue`: Admin belum dapat mengisi assignment NPSN otomatis dari pasangan npsn dan petugas_reviu pada master_bapp. [apps/api/src/bapp-review.ts:59]
- 2026-11-13T08:46:36Z `attempt`: Tambah tombol admin dan endpoint auto assign dari master_bapp; cocokkan reviewer terdaftar, lewati NPSN dengan petugas berbeda, dan uji pemilihan pasangan. [apps/api/src/bapp-review.ts] (partial)
- 2026-11-13T08:47:39Z `fix`: Tombol Auto Assign dari Master BAPP mengisi assignment dari pasangan NPSN dan petugas_reviu yang cocok; API/web build serta tes pasangan lulus. [apps/web/pages/assign-npsn-bapp.vue:91]
