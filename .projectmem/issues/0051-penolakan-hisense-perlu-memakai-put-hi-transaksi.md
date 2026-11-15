# #0051 Penolakan Hisense perlu memakai PUT /hi-transaksi/alokasi/review/:id dengan tag_revisi string; contoh memakai token StaffSMK, sementara aplikasi memakai token Direktorat SMK.

- 2026-11-15T10:49:01Z `issue`: Penolakan Hisense perlu memakai PUT /hi-transaksi/alokasi/review/:id dengan tag_revisi string; contoh memakai token StaffSMK, sementara aplikasi memakai token Direktorat SMK. [apps/api/src/hisense.ts:61]
- 2026-11-15T10:52:50Z `attempt`: Reject diarahkan ke PUT /hi-transaksi/alokasi/review/:id dengan token hi-auth bawaan, tag_revisi string, reviewer_name username login; uji mock 401 dan probe ID palsu HTTP 404 tanpa error SQL. [apps/api/src/hisense.ts:61] (worked)
- 2026-11-15T10:52:57Z `fix`: Payload penolakan cocok dengan curl Hisense: PUT alokasi review, kode_status_progress REVISI, catatan, tag string, reviewer_name; token sistem diperbarui otomatis. Build dan test lolos; hasil reviewer remote belum diverifikasi. [apps/api/src/hisense.ts:61]
