# #0024 Cek BAPP belum memiliki tab status progress dan jumlah per status untuk transaksi yang di-assign.

- 2026-11-13T10:20:30Z `issue`: Cek BAPP belum memiliki tab status progress dan jumlah per status untuk transaksi yang di-assign. [apps/web/pages/cek-bapp.vue]
- 2026-11-13T10:25:11Z `attempt`: Tambahkan tab status berjumlah dari master_bapp per akun, pagination transaksi per status, dan filter tabel; alur Semua NPSN tetap tersedia. [apps/api/src/bapp-review.ts] (partial)
- 2026-11-13T10:28:53Z `fix`: Cek BAPP kini punya tab status dengan jumlah transaksi lintas halaman dan filter/pagination per status; tab Semua NPSN tetap ada. Build API/web, query status live, dan diff check lulus. [apps/web/pages/cek-bapp.vue]
