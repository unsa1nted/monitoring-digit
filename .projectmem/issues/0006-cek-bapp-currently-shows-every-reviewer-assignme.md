# #0006 Cek BAPP currently shows every reviewer assignment; admin accepts only one NPSN. Match assignments to Internal login username and accept multiline NPSN,username batch.

- 2026-11-13T05:32:48Z `issue`: Cek BAPP currently shows every reviewer assignment; admin accepts only one NPSN. Match assignments to Internal login username and accept multiline NPSN,username batch. [apps/api/src/bapp-review.ts:59]
- 2026-11-13T05:35:20Z `attempt`: Scoped Cek BAPP assignments by Internal login username and changed admin assign endpoint/form to atomic 1–100 multiline NPSN,username rows. [apps/api/src/bapp-review.ts:59] (worked)
- 2026-11-13T05:35:26Z `fix`: Matching users.username now sees only assigned NPSNs in Cek BAPP. Bulk assignment validates rows/reviewers, rejects duplicate NPSN, and commits together. API/web builds and lookup/validation check pass. [apps/api/src/bapp-review.ts:59]
