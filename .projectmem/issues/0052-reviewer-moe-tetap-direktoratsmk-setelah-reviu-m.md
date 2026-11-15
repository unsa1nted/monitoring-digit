# #0052 Reviewer MOE tetap direktoratsmk setelah reviu memakai token sistem meski payload reviewer_name adalah username petugas login.

- 2026-11-15T10:58:01Z `issue`: Reviewer MOE tetap direktoratsmk setelah reviu memakai token sistem meski payload reviewer_name adalah username petugas login. [apps/api/src/hisense.ts:61]
- 2026-11-15T11:01:08Z `attempt`: Bandingkan log persetujuan aplikasi terbaru dengan GET Hisense: 1 persetujuan ditemukan, approved_by_moe tidak cocok username login dan bernilai akun integrasi direktoratsmk. Payload reviewer_name tidak menentukan field itu. [apps/api/src/hisense.ts:61] (partial)
- 2026-11-15T11:34:03Z `attempt`: Batalkan login Hisense per petugas; kembali ke token sistem dan reviewer_name=username login. Mock review, build API/web lulus; Hisense remote sebelumnya tetap menyimpan direktoratsmk. [apps/api/src/hisense.ts:61] (partial)
