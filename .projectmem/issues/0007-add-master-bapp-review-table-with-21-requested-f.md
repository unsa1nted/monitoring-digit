# #0007 Add master_bapp review table with 21 requested fields; eight photo verdicts determine final result, and Cek BAPP should show green/red verdicts.

- 2026-11-13T05:42:17Z `issue`: Add master_bapp review table with 21 requested fields; eight photo verdicts determine final result, and Cek BAPP should show green/red verdicts. [apps/api/src/db/schema.ts]
- 2026-11-13T05:47:00Z `attempt`: Added master_bapp migration, manual eight-photo verdict form, saved-review API, and green/red table outcomes. Migration, builds, and verdict test passed. [apps/api/src/db/schema.ts:23] (worked)
- 2026-11-13T05:48:10Z `fix`: master_bapp stores 21 requested fields and manual eight-photo Ya/Tidak verdicts. Any Tidak saves Tidak Sesuai; all Ya saves Sesuai. Cek BAPP renders green check/red X. Migration and builds passed. [apps/api/drizzle/0015_panoramic_rictor.sql:1]
