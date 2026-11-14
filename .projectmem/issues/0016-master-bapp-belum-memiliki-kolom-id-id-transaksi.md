# #0016 master_bapp belum memiliki kolom id; id_transaksi saat ini primary key.

- 2026-11-13T08:12:07Z `issue`: master_bapp belum memiliki kolom id; id_transaksi saat ini primary key. [apps/api/src/db/schema.ts:23]
- 2026-11-13T08:13:36Z `attempt`: Tambahkan id BIGINT AUTO_INCREMENT sebagai primary key master_bapp, pertahankan id_transaksi UNIQUE, dan perbaiki urutan migrasi Drizzle untuk data lama. [apps/api/drizzle/0016_absent_rockslide.sql] (partial)
- 2026-11-13T08:14:13Z `fix`: Schema dan migrasi 0016 menambah id AUTO_INCREMENT PK pada master_bapp serta mempertahankan id_transaksi UNIQUE; build API lulus. [apps/api/drizzle/0016_absent_rockslide.sql:1]
