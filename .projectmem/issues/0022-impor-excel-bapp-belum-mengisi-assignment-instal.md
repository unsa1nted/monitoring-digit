# #0022 Impor Excel BAPP belum mengisi assignment; INSTALASI SELESAI Resubmit TRUE masih memakai Reviewer MOE dan Tag Revisi masih diimpor.

- 2026-11-13T10:00:41Z `issue`: Impor Excel BAPP belum mengisi assignment; INSTALASI SELESAI Resubmit TRUE masih memakai Reviewer MOE dan Tag Revisi masih diimpor. [apps/api/src/bapp-excel-import.ts]
- 2026-11-13T10:03:22Z `attempt`: Impor Excel memakai Reviewer MOE Revisi untuk INSTALASI SELESAI Resubmit TRUE, mengosongkan Tag, dan meng-upsert assignment NPSN cocok dalam transaksi yang sama. [apps/api/src/bapp-review.ts] (partial)
- 2026-11-13T10:04:29Z `fix`: Impor Excel kini memakai Reviewer MOE Revisi untuk Resubmit TRUE + INSTALASI SELESAI, mengosongkan Tag, dan meng-upsert assignment NPSN atomik; build API/web dan tes parser-assignment lulus. [apps/api/src/bapp-review.ts:180]
