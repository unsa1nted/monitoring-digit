# #0002 Add standalone petugas_reviewer table with id, nama_petugas, and user_petugas; no login relation.

- 2026-11-13T04:37:46Z `issue`: Add standalone petugas_reviewer table with id, nama_petugas, and user_petugas; no login relation. [apps/api/src/db/schema.ts]
- 2026-11-13T04:38:33Z `attempt`: Defined petugas_reviewer with standalone string fields and generated Drizzle migration 0013; API TypeScript build passed. [apps/api/src/db/schema.ts:12] (worked)
- 2026-11-13T04:38:37Z `fix`: Created petugas_reviewer schema and migration with id PK, nama_petugas, user_petugas; no login foreign key. db:generate, API build, diff check pass. [apps/api/drizzle/0013_round_quasimodo.sql:1]
