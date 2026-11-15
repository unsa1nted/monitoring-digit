# #0043 Hisense menampilkan Reviewer MOE direktoratsmk meski payload review mengirim reviewer_name petugas; selidiki kontrak endpoint dan sumber nilai kolom.

- 2026-11-15T08:27:55Z `issue`: Hisense menampilkan Reviewer MOE direktoratsmk meski payload review mengirim reviewer_name petugas; selidiki kontrak endpoint dan sumber nilai kolom. [apps/api/src/hisense.ts:61]
- 2026-11-15T08:29:52Z `attempt`: Pindahkan reviu dari PUT endpoint admin ke POST /direktorat/approve atau /reject dengan token direktorat dan reviewer_name petugas; uji mock dan build API lulus. [apps/api/src/hisense.ts:61] (worked)
- 2026-11-15T08:29:57Z `fix`: Aksi approve/reject memakai endpoint direktorat yang mendokumentasikan reviewer_name sebagai sumber approved_by_moe/rejected_by_moe; build API dan test-hisense-export lulus. [apps/api/src/hisense.ts:61]
