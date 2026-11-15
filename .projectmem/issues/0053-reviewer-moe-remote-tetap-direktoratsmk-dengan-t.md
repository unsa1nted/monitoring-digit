# #0053 Reviewer MOE remote tetap direktoratsmk dengan token sistem; perlu token Hisense per petugas dan fitur admin ubah password beberapa akun aplikasi.

- 2026-11-15T11:37:42Z `issue`: Reviewer MOE remote tetap direktoratsmk dengan token sistem; perlu token Hisense per petugas dan fitur admin ubah password beberapa akun aplikasi. [apps/api/src/hisense.ts:61]
- 2026-11-15T11:43:38Z `attempt`: Login reviewer memakai password aplikasi untuk token StaffSMK, reviu PUT memakai token sesi; admin bulk password per reviewer divalidasi Hisense lalu DB transaction. Mock approve/reject dan build API/web lulus; belum uji remote live/DB. [apps/api/src/hisense.ts:64] (partial)
