# #0005 Migration 0014 fails ER_TOO_LONG_IDENT on auto-generated bapp reviewer assignment foreign key; MySQL may have applied preceding DDL.

- 2026-11-13T05:06:31Z `issue`: Migration 0014 fails ER_TOO_LONG_IDENT on auto-generated bapp reviewer assignment foreign key; MySQL may have applied preceding DDL. [apps/api/drizzle/0014_tiresome_mikhail_rasputin.sql:8]
- 2026-11-13T05:17:57Z `attempt`: Renamed FK to bapp_reviewer_petugas_fk, rolled back empty partial 0014 DDL, reran migration successfully. [apps/api/drizzle/0014_tiresome_mikhail_rasputin.sql:8] (worked)
- 2026-11-13T05:18:42Z `fix`: Short FK name applied in schema, SQL migration, and snapshot. Migration applied successfully after rollback; API build and diff check pass. [apps/api/src/db/schema.ts:20]
