# #0030 Impor hasil reviu tidak menyalin Petugas Reviu dari spreadsheet ke master_bapp dan assignment NPSN; data bisa berbeda.

- 2026-11-13T12:20:49Z `issue`: Impor hasil reviu tidak menyalin Petugas Reviu dari spreadsheet ke master_bapp dan assignment NPSN; data bisa berbeda. [apps/api/src/bapp-review.ts:223]
- 2026-11-13T12:25:05Z `attempt`: Impor hasil reviu membaca Petugas Reviu, mencocokkan username/nama terdaftar, memperbarui master_bapp dan upsert assignment NPSN dalam transaksi. Petugas pertama per NPSN menang saat konflik. [apps/api/src/bapp-review.ts:223] (worked)
- 2026-11-13T12:25:09Z `fix`: Petugas Reviu dari Excel menyinkronkan master_bapp.petugas_reviu dan assignment NPSN, termasuk mengganti nilai lama; tes parser/konflik dan build API/web lulus. [apps/api/src/bapp-review.ts:223]
