# #0004 Admin needs NPSN-to-reviewer assignment; Cek BAPP should load assigned Hisense transactions while reviewer remains independent of login.

- 2026-11-13T04:53:27Z `issue`: Admin needs NPSN-to-reviewer assignment; Cek BAPP should load assigned Hisense transactions while reviewer remains independent of login. [apps/web/pages/cek-bapp.vue]
- 2026-11-13T05:04:04Z `attempt`: Added reviewer assignment migration, admin form/API, and assigned-NPSN Hisense rows in Cek BAPP. API/web builds and lookup test pass. [apps/api/src/bapp-review.ts:1] (worked)
- 2026-11-13T05:04:12Z `fix`: Admin can register reviewer and assign NPSN; Cek BAPP shows only assigned NPSN with exact-matched Hisense SMK transactions and reviewer username. Builds, pagination/filter test, and diff check pass. [apps/web/pages/assign-npsn-bapp.vue:1]
