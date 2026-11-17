# #0063 Rekap petugas: Alokasi tidak sama dengan Sudah Diperiksa; telusuri sumber dan rumus hitung.

- 2026-11-17T10:08:33Z `issue`: Rekap petugas: Alokasi tidak sama dengan Sudah Diperiksa; telusuri sumber dan rumus hitung.
- 2026-11-17T10:10:28Z `attempt`: Menelusuri agregasi dashboard; query SQL lokal untuk rincian status petugas gagal karena koneksi database lokal tidak tersedia. [apps/api/src/bapp-review.ts:526] (partial)
- 2026-11-17T10:13:27Z `attempt`: Tentukan kategori saling lepas dari status REVISI, status final Hisense, hasil reviu, dan sisanya belum diperiksa; hitung ulang agregat dari kategori. [apps/api/src/bapp-review.ts:526] (partial)
- 2026-11-17T10:15:35Z `attempt`: Agregasi dashboard diganti menjadi kategori eksklusif; build API dan git diff --check lulus. Pemeriksaan total database belum jalan karena MySQL lokal ECONNREFUSED. [apps/api/src/bapp-review.ts:526] (partial)
