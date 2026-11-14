# #0031 Jumlah master_bapp.petugas_reviu='aprilia' 384, tetapi dashboard Alokasi 382; perlu identifikasi transaksi dan aturan assignment penyebab selisih.

- 2026-11-13T12:54:01Z `issue`: Jumlah master_bapp.petugas_reviu='aprilia' 384, tetapi dashboard Alokasi 382; perlu identifikasi transaksi dan aturan assignment penyebab selisih. [apps/api/src/bapp-review.ts:313]
- 2026-11-13T12:56:57Z `attempt`: Query lokal menunjukkan 384 baris petugas_reviu=aprilia tetapi 382 baris melalui assignment NPSN; dua transaksi aprilia di NPSN 69902903/70052052 di-assign ke putri.yanti. [apps/api/src/bapp-review.ts:313] (worked)
- 2026-11-13T12:57:05Z `fix`: Selisih Alokasi aprilia terjelaskan oleh dua baris master_bapp milik aprilia pada NPSN yang assignment-nya putri.yanti; dashboard menghitung assignment NPSN sesuai aturan yang disepakati. Tidak ada perubahan data. [apps/api/src/bapp-review.ts:313]
