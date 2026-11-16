# #0061 Sinkron otomatis BAPP perlu memakai API direktorat R1: A daftar, B detail bulk, C detail tunggal; hindari ekspor Excel

- 2026-11-16T12:57:42Z `issue`: Sinkron otomatis BAPP perlu memakai API direktorat R1: A daftar, B detail bulk, C detail tunggal; hindari ekspor Excel [apps/api/src/bapp-review.ts:254]
- 2026-11-16T13:09:31Z `attempt`: Ganti sinkron BAPP 10 menit dari ekspor Excel ke daftar A dan bulk B hanya untuk ID baru/berubah; detail C langsung berdasarkan ID; build API/web dan uji mock B/C lulus [apps/api/src/bapp-review.ts:287] (worked)
- 2026-11-16T13:09:56Z `fix`: Sinkron otomatis BAPP tiap 10 menit menggunakan A list, B bulk max100 untuk perubahan, dan C detail tunggal untuk aksi; build API/web, uji mock, diff check lulus. [apps/api/src/bapp-review.ts:287]
