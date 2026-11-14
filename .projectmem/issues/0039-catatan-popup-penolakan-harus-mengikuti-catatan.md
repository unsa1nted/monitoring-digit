# #0039 Catatan popup penolakan harus mengikuti catatan foto Tidak Sesuai; penampil foto belum punya zoom dan layar penuh

- 2026-11-14T09:02:47Z `issue`: Catatan popup penolakan harus mengikuti catatan foto Tidak Sesuai; penampil foto belum punya zoom dan layar penuh [apps/web/pages/cek-bapp.vue]
- 2026-11-14T09:08:02Z `attempt`: Popup menampilkan catatan hanya dari foto Tidak Sesuai sebagai teks baca saja; viewer memakai zoom 100-400%, scroll, dan Fullscreen API; build web dan tes catatan lulus [apps/web/pages/cek-bapp.vue:296] (worked)
- 2026-11-14T09:08:07Z `fix`: Catatan penolakan Hisense kini diturunkan dari komentar tiap foto Tidak Sesuai; zoom dan layar penuh tersedia di foto reviu [apps/web/pages/cek-bapp.vue:240]
