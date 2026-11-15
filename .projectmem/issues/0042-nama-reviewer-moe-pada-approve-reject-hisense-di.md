# #0042 Nama Reviewer MOE pada approve/reject Hisense diduga memakai akun integrasi direktoratsmk, bukan username petugas login.

- 2026-11-15T08:16:26Z `issue`: Nama Reviewer MOE pada approve/reject Hisense diduga memakai akun integrasi direktoratsmk, bukan username petugas login. [apps/api/src/bapp-review.ts]
- 2026-11-15T08:17:39Z `attempt`: Ubah payload reviewer_name approve/reject menjadi username sesi Internal; hilangkan lookup nama petugas. [apps/api/src/bapp-review.ts:582] (worked)
- 2026-11-15T08:18:12Z `fix`: Approve/reject mengirim reviewer_name dari user.username sesi login; build API, test-hisense-export, diff check lulus. [apps/api/src/bapp-review.ts:585]
