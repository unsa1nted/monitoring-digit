# #0020 Sinkronisasi approved_by_moe saat ini menimpa master_bapp.petugas_reviu yang sudah terisi; diminta hanya mengisi nilai kosong.

- 2026-11-13T09:23:53Z `issue`: Sinkronisasi approved_by_moe saat ini menimpa master_bapp.petugas_reviu yang sudah terisi; diminta hanya mengisi nilai kosong. [apps/api/src/bapp-review.ts]
- 2026-11-13T09:25:37Z `attempt`: Batasi koleksi dan UPDATE SQL sinkron Hisense pada petugas_reviu kosong atau spasi; ubah ringkasan UI dan tes agar nilai terisi tidak tertimpa. [apps/api/src/bapp-review.ts] (partial)
- 2026-11-13T09:26:28Z `fix`: Sinkron Hisense sekarang hanya mengisi petugas_reviu kosong/spasi; UPDATE SQL mengecek ulang nilai kosong agar isian lain tetap. Build API/web dan tes lulus. [apps/api/src/bapp-review.ts]
