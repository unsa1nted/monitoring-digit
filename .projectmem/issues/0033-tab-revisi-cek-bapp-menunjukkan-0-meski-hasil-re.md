# #0033 Tab REVISI Cek BAPP menunjukkan 0 meski hasil reviu Tidak Sesuai ada; paginasi 5 baris dan nomor tabel selalu mulai dari 1.

- 2026-11-13T13:43:51Z `issue`: Tab REVISI Cek BAPP menunjukkan 0 meski hasil reviu Tidak Sesuai ada; paginasi 5 baris dan nomor tabel selalu mulai dari 1. [apps/api/src/bapp-review.ts:369]
- 2026-11-13T13:46:59Z `attempt`: Cek BAPP memakai tab Ditolak / Sedang Revisi untuk gabungan hasil Tidak Sesuai atau status REVISI; API mengembalikan 15 baris per halaman dan nomor tabel memakai offset halaman. [apps/api/src/bapp-review.ts:369] (worked)
- 2026-11-13T13:47:04Z `fix`: Tab gabungan Ditolak / Sedang Revisi menghitung kondisi unik; pagination 15 data dan nomor global per halaman. Tes tab, build API/web, diff check lulus. [apps/web/pages/cek-bapp.vue:51]
