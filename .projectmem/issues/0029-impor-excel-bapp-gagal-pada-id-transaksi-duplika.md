# #0029 Impor Excel BAPP gagal pada ID Transaksi duplikat; pengguna meminta baris pertama dipakai dan duplikat berikutnya dilewati.

- 2026-11-13T12:11:09Z `issue`: Impor Excel BAPP gagal pada ID Transaksi duplikat; pengguna meminta baris pertama dipakai dan duplikat berikutnya dilewati. [apps/api/src/bapp-excel-import.ts]
- 2026-11-13T12:13:42Z `attempt`: Kedua parser impor BAPP kini menyimpan baris pertama per ID Transaksi dan melewati duplikat berikutnya; jumlah dilewati ditampilkan di Admin. [apps/api/src/bapp-excel-import.ts:46] (worked)
- 2026-11-13T12:13:46Z `fix`: ID Transaksi duplikat tidak menghentikan impor BAPP; baris pertama dipertahankan. Dua tes impor, build API/web, diff check lulus. [apps/api/src/bapp-excel-import.ts:46]
