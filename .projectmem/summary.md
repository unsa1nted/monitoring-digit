# projectmem - monitoring-digit

_Last updated: 2026-11-15_

## Project purpose
Nuxt dashboard + Elysia API + MySQL database.

## Recent issues
- [DONE] #0048 Foto di modal reviu BAPP tampil terlalu penuh; perlu ukuran awal yang fit dan tetap mendukung zoom. [apps/web/pages/cek-bapp.vue:430] (fixed)
- [DONE] #0047 Kotak catatan tetap tidak tampil di modal Reviu BAPP walau status Sedang Ditolak terlihat; periksa perbedaan data list dan detail Hisense. [apps/web/pages/cek-bapp.vue:516] (fixed)
- [DONE] #0046 Bagian atas modal reviu BAPP masih terpotong dan modal tidak memenuhi layar setelah perbaikan overflow. [apps/web/pages/cek-bapp.vue:375] (fixed)
- [DONE] #0045 Catatan penolakan tidak tampil di modal Cek BAPP meski Hisense menyediakan catatan_revisi. [apps/web/pages/cek-bapp.vue:122] (fixed)
- [DONE] #0044 Modal reviu BAPP tampak terpotong; perlu notifikasi sukses, catatan penolakan/revisi sebelumnya, dan perpindahan foto otomatis setelah penilaian. [apps/web/pages/cek-bapp.vue] (fixed)
- [DONE] #0043 Hisense menampilkan Reviewer MOE direktoratsmk meski payload review mengirim reviewer_name petugas; selidiki kontrak endpoint dan sumber nilai kolom. [apps/api/src/hisense.ts:61] (fixed)
- [DONE] #0042 Nama Reviewer MOE pada approve/reject Hisense diduga memakai akun integrasi direktoratsmk, bukan username petugas login. [apps/api/src/bapp-review.ts] (fixed)
- [DONE] #0041 Impor BAPP gagal saat belum ada petugas reviewer karena notifikasi dibuat tanpa alokasi. [apps/api/src/bapp-review.ts:206] (fixed)
- [DONE] #0040 Nuxt gagal parse cek-bapp.vue?macro=true: Unterminated string constant setelah perapian UI [apps/web/pages/cek-bapp.vue] (fixed)
- [DONE] #0039 Catatan popup penolakan harus mengikuti catatan foto Tidak Sesuai; penampil foto belum punya zoom dan layar penuh [apps/web/pages/cek-bapp.vue] (fixed)
- ...and 38 older fixed issues not shown (`pjm search`, or `get_issue(issue_id)` via MCP)

## Decisions
- Auto assign dari master_bapp memperbarui assignment NPSN yang cocok dengan reviewer terdaftar; NPSN dengan lebih dari satu petugas_reviu dilewati agar tidak memilih petugas secara acak. [apps/api/src/bapp-review.ts:45]
- Tombol Ambil Data Petugas hanya mengisi master_bapp.petugas_reviu yang kosong dari Hisense approved_by_moe menurut id_transaksi; nilai terisi, petugas_reviewer, dan assignment tidak diubah. [apps/api/src/bapp-review.ts]
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
- Approve/reject BAPP menggunakan endpoint POST /direktorat/approve dan /reject dengan token direktorat; reviewer_name berasal dari username akun Internal. Endpoint admin hi-transaksi tidak dipakai untuk reviu. [apps/api/src/hisense.ts:61]

## Notes
- feat: Update port
- feat: Update core
- Cek BAPP menampilkan REVISI dari master_bapp.petugas_reviu; tab Ditolak (REVISI) selalu terlihat. Kolom sudah_ada_revisi menampilkan badge biru Tidak dan oranye Revisi Tersedia. [apps/web/pages/cek-bapp.vue:51]
- Cek BAPP Status Progress kini memakai badge berbeda: Instalasi Selesai biru, Revisi merah, Disetujui hijau, Reviu APIP ungu, Sesuai APIP teal; status lain abu-abu. [apps/web/pages/cek-bapp.vue:59]
- gotcha: Direktorat Hisense token hanya untuk /direktorat; approve/reject BAPP memakai /hi-auth/login dan PUT /hi-transaksi/alokasi/review/:id [apps/api/src/hisense.ts:61]
- New feature: feat: Update add BAPP system [apps/api/drizzle/0013_round_quasimodo.sql]
- New feature: feat: update [apps/api/src/bapp-review.ts]
- New feature: feat: Update [apps/api/scripts/test-hisense-export.ts]
- New feature: feat: update [apps/web/pages/cek-bapp.vue]
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
