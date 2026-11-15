# #0055 Approve BAPP menampilkan error status DISETUJUI saat transaksi sebenarnya sudah disetujui; perlu respons sukses idempoten.

- 2026-11-15T15:44:28Z `issue`: Approve BAPP menampilkan error status DISETUJUI saat transaksi sebenarnya sudah disetujui; perlu respons sukses idempoten. [apps/api/src/bapp-review.ts:552]
- 2026-11-15T15:45:45Z `attempt`: Temukan PATCH draft dan POST approve sama-sama menolak status DISETUJUI; siapkan POST approve idempoten dan lewati autosave draft sebelum aksi final. [apps/api/src/bapp-review.ts:585] (partial)
- 2026-11-15T15:48:19Z `attempt`: PATCH draft DISETUJUI kini no-op sukses; POST approve idempoten untuk status lokal atau Hisense DISETUJUI; tombol final menunggu draft aktif tanpa memaksa draft baru. Build API/web dan diff check lulus. [apps/api/src/bapp-review.ts:536] (worked)
- 2026-11-15T15:48:25Z `fix`: Approve transaksi yang sudah DISETUJUI mengembalikan sukses dan menampilkan toast berhasil disetujui; autosave draft tidak lagi memunculkan error status DISETUJUI. Build API/web dan git diff --check lulus. [apps/web/pages/cek-bapp.vue:302]
