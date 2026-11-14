# #0023 REVIU APIP belum termasuk status impor Excel; transaksi DISETUJUI/SESUAI APIP/REVIU APIP masih dapat diubah hasil reviunya.

- 2026-11-13T10:15:38Z `issue`: REVIU APIP belum termasuk status impor Excel; transaksi DISETUJUI/SESUAI APIP/REVIU APIP masih dapat diubah hasil reviunya. [apps/api/src/bapp-excel-import.ts]
- 2026-11-13T10:17:51Z `attempt`: Tambahkan REVIU APIP ke status impor dan sembunyikan tombol reviu untuk DISETUJUI/SESUAI APIP/REVIU APIP; API POST menolak ketiga status. [apps/api/src/bapp-review.ts] (partial)
- 2026-11-13T10:18:24Z `fix`: REVIU APIP diterima saat impor; tombol reviu hilang untuk DISETUJUI/SESUAI APIP/REVIU APIP dan POST API menolak perubahan. Build API/web, tes impor, diff check lulus. [apps/web/pages/cek-bapp.vue]
