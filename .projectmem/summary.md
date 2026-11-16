# projectmem - monitoring-digit

_Last updated: 2026-11-16_

## Project purpose
Nuxt dashboard + Elysia API + MySQL database.

## Recent issues
- [OPEN] #0053 Reviewer MOE remote tetap direktoratsmk dengan token sistem; perlu token Hisense per petugas dan fitur admin ubah password beberapa akun aplikasi. [apps/api/src/hisense.ts:61] (open)
  - Partial attempt: Login reviewer memakai password aplikasi untuk token StaffSMK, reviu PUT memakai token sesi; admin bulk password per reviewer divalidasi Hisense lalu DB transaction. Mock approve/reject dan build API/web lulus; belum uji remote live/DB. [apps/api/src/hisense.ts:64]
- [OPEN] #0052 Reviewer MOE tetap direktoratsmk setelah reviu memakai token sistem meski payload reviewer_name adalah username petugas login. [apps/api/src/hisense.ts:61] (open)
  - Partial attempt: Bandingkan log persetujuan aplikasi terbaru dengan GET Hisense: 1 persetujuan ditemukan, approved_by_moe tidak cocok username login dan bernilai akun integrasi direktoratsmk. Payload reviewer_name tidak menentukan field itu. [apps/api/src/hisense.ts:61]
  - Partial attempt: Batalkan login Hisense per petugas; kembali ke token sistem dan reviewer_name=username login. Mock review, build API/web lulus; Hisense remote sebelumnya tetap menyimpan direktoratsmk. [apps/api/src/hisense.ts:61]
- [DONE] #0056 Klik foto surat keterangan membuka tab baru; perlu pratinjau membesar di modal yang sama [apps/web/pages/cek-bapp.vue:578] (fixed)
- [DONE] #0055 Approve BAPP menampilkan error status DISETUJUI saat transaksi sebenarnya sudah disetujui; perlu respons sukses idempoten. [apps/api/src/bapp-review.ts:552] (fixed)
- [DONE] #0054 Permintaan catatan perbaikan untuk status Revisi Tersedia dan autosave pilihan reviu foto; periksa alur penyimpanan saat ini. [apps/web/pages/cek-bapp.vue] (fixed)
- [DONE] #0051 Penolakan Hisense perlu memakai PUT /hi-transaksi/alokasi/review/:id dengan tag_revisi string; contoh memakai token StaffSMK, sementara aplikasi memakai token Direktorat SMK. [apps/api/src/hisense.ts:61] (fixed)
- [DONE] #0050 Perlu memastikan Reviewer MOE Hisense cocok dengan petugas yang menyetujui, serta menyimpan riwayat sinkron Excel otomatis dengan waktu dan jumlah alokasi per petugas. [apps/api/src/bapp-review.ts] (fixed)
- [DONE] #0049 Penolakan BAPP ke endpoint direktorat Hisense gagal: column a.kode_direktorat does not exist. [apps/api/src/hisense.ts:61] (fixed)
- [DONE] #0048 Foto di modal reviu BAPP tampil terlalu penuh; perlu ukuran awal yang fit dan tetap mendukung zoom. [apps/web/pages/cek-bapp.vue:430] (fixed)
- [DONE] #0047 Kotak catatan tetap tidak tampil di modal Reviu BAPP walau status Sedang Ditolak terlihat; periksa perbedaan data list dan detail Hisense. [apps/web/pages/cek-bapp.vue:516] (fixed)
- [DONE] #0046 Bagian atas modal reviu BAPP masih terpotong dan modal tidak memenuhi layar setelah perbaikan overflow. [apps/web/pages/cek-bapp.vue:375] (fixed)
- [DONE] #0045 Catatan penolakan tidak tampil di modal Cek BAPP meski Hisense menyediakan catatan_revisi. [apps/web/pages/cek-bapp.vue:122] (fixed)
- ...and 44 older fixed issues not shown (`pjm search`, or `get_issue(issue_id)` via MCP)

## Decisions
- ...2 earlier decisions not shown (`pjm search`, or `search_events(query)` via MCP)
- Impor Excel BAPP otomatis meng-upsert assignment NPSN untuk reviewer terdaftar saat pasangan petugas per NPSN konsisten; INSTALASI SELESAI Resubmit TRUE memakai Reviewer MOE Revisi, baris lain Reviewer MOE, Tag dikosongkan, dan nilai reviu foto lama dipertahankan. [apps/api/src/bapp-review.ts]
- REVIU APIP diimpor seperti SESUAI APIP; DISETUJUI, SESUAI APIP, dan REVIU APIP tidak menampilkan aksi reviu dan API menolak perubahan reviu. [apps/api/src/bapp-review.ts:12]
- Impor hasil reviu Excel memakai Serial Number untuk mencocokkan master_bapp; ID Transaksi membedakan serial ganda. Delapan sel foto kosong menjadi NULL, dan Hasil Akhir Reviu dari sheet dipakai atau dihitung bila foto lengkap. [apps/api/src/bapp-excel-import.ts:21]
- Cek BAPP menampilkan transaksi per akun Internal dari master_bapp.petugas_reviu = users.username; tab status, daftar, detail, dan simpan tidak memakai assignment NPSN. [apps/api/src/bapp-review.ts:369]
- Impor hasil reviu memperbarui petugas_reviu untuk tiap transaksi sesuai Petugas Reviu di Excel; satu NPSN boleh memiliki transaksi dengan petugas berbeda dan impor tidak menyentuh assignment. [apps/api/src/bapp-review.ts:240]
- Dashboard BAPP tetap memakai master_bapp.petugas_reviu. Ditolak menghitung hasil_akhir_reviu Tidak Sesuai kecuali status REVISI; Sedang Revisi menghitung status REVISI. Total Ditolak/Revisi menghitung gabungan unik kedua kondisi. [apps/api/src/bapp-review.ts:315]
- Kartu Perlu Direviu pada Cek BAPP dan dashboard menghitung semua transaksi master_bapp berstatus INSTALASI SELESAI, tanpa membatasi resubmit atau hasil reviu; nilai akun sama dengan jumlah tab status tersebut. [apps/api/src/bapp-review.ts:314]
- Kolom Belum Diperiksa per reviewer menghitung transaksi master_bapp dengan sudah_ada_revisi Tidak dan status_progress INSTALASI SELESAI, tanpa filter hasil_akhir_reviu. [apps/api/src/bapp-review.ts:335]
- Cek BAPP memakai AppIcon yang sudah ada, header gelap, tab status berkode warna, dan tabel berpanel; alur data/reviu tetap sama [apps/web/pages/cek-bapp.vue:270]
- Tabel Petugas Reviewer mengurutkan peringkat berdasarkan jumlah sudahDiperiksa; jumlah alokasi tetap ditampilkan sebagai statistik terpisah [apps/api/src/bapp-review.ts:426]
- Tabel Petugas Reviewer memuat ulang /api/bapp-dashboard tiap 60 detik saat halaman terbuka; cap waktu WIB berubah hanya setelah permintaan berhasil [apps/web/pages/index.vue:46]
- Catat tiap sinkron unduhan Hisense yang berhasil (otomatis/manual) dalam bapp_hisense_sync_runs, termasuk snapshot jumlah alokasi per reviewer; impor file manual tidak masuk riwayat ini. [apps/api/src/db/schema.ts:59]
- Petugas reviewer login aplikasi dengan password yang sama seperti Hisense; API memperoleh token StaffSMK dan menyimpannya sementara per sesi. Approve/reject memakai token itu. Admin dapat menyamakan password beberapa reviewer setelah validasi Hisense. [apps/api/src/hisense.ts:64]
- Autosave pilihan dan catatan foto sebagai draft di master_bapp lewat PATCH; perubahan status Hisense tetap hanya pada persetujuan atau penolakan final. [apps/api/src/bapp-review.ts:536]
- Approve BAPP idempoten untuk status DISETUJUI pada master atau Hisense; draft pada status DISETUJUI diabaikan tanpa error, status lokal disinkronkan bila Hisense sudah menyetujui. [apps/api/src/bapp-review.ts:536]

## Notes
- New feature: feat: update [apps/web/pages/cek-bapp.vue]
- New feature: feat: Update [apps/web/pages/cek-bapp.vue]
- New feature: feat: update [apps/api/src/bapp-review.ts]
- New feature: feat : Update [apps/api/drizzle/0020_busy_starbolt.sql]
- New feature: feat: update [apps/api/scripts/test-hisense-export.ts]
- gotcha: Token Hisense petugas hanya ada di memori proses API; setelah restart API, petugas perlu logout/login lagi sebelum approve atau reject. [apps/api/src/hisense.ts:24]
- New feature: feat: Update [apps/api/scripts/test-hisense-export.ts]
- New feature: feat: Update [apps/api/src/bapp-review.ts]
- New feature: feat: Update core [apps/api/scripts/test-bapp-notifications.ts]
- New feature: feat: Update [apps/web/pages/cek-bapp.vue]

## Key files
- `.env.example`
- `.gitignore`
- `AGENTS.md`
- `README.md`
- `RTK.md`
- `apps/api/drizzle.config.ts`
- `apps/api/drizzle/0000_clear_rachel_grey.sql`
- `apps/api/drizzle/0001_wealthy_rogue.sql`
- `apps/api/drizzle/0002_pale_malcolm_colcord.sql`
- `apps/api/drizzle/0003_flimsy_matthew_murdock.sql`
- `apps/api/drizzle/0004_pale_lockjaw.sql`
- `apps/api/drizzle/0005_rich_christian_walker.sql`
- `apps/api/drizzle/0006_secret_lifeguard.sql`
- `apps/api/drizzle/0007_fair_sabretooth.sql`
- `apps/api/drizzle/0008_amused_crystal.sql`
- `apps/api/drizzle/0009_silly_klaw.sql`
- `apps/api/drizzle/0010_chief_ultimatum.sql`
- `apps/api/drizzle/meta/0000_snapshot.json`
- `apps/api/drizzle/meta/0001_snapshot.json`
- `apps/api/drizzle/meta/0002_snapshot.json`

## Open questions
- None logged yet.
