# #0021 master_bapp belum mendukung impor Excel status terpilih sebelum foto dinilai: kolom reviu wajib dan tidak ada endpoint impor.

- 2026-11-13T09:45:20Z `issue`: master_bapp belum mendukung impor Excel status terpilih sebelum foto dinilai: kolom reviu wajib dan tidak ada endpoint impor. [apps/api/src/db/schema.ts:23]
- 2026-11-13T09:51:53Z `attempt`: Tambahkan migrasi kolom foto nullable, parser Excel status terbatas, endpoint admin impor, UI unggah, dan tampilan revisi; reviu lama tetap saat upsert. [apps/api/src/bapp-excel-import.ts] (partial)
- 2026-11-13T09:55:10Z `fix`: Admin dapat impor Excel ke master_bapp untuk empat status dengan Resubmit Ya/Tidak dan Reviewer MOE; review foto lama tidak tertimpa. Migrasi 0017 diterapkan; 4614 baris lama tetap, build API/web dan tes parser lulus. [apps/api/src/bapp-excel-import.ts]
