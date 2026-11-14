# #0010 Photo review controls blend into dark modal area and can scroll out of view; move verdict/navigation into visible white footer below centered photo.

- 2026-11-13T06:56:31Z `issue`: Photo review controls blend into dark modal area and can scroll out of view; move verdict/navigation into visible white footer below centered photo. [apps/web/pages/cek-bapp.vue:160]
- 2026-11-13T06:57:58Z `attempt`: Moved verdict and photo navigation buttons into a separate white footer beneath the centered dark photo area; improved text/button contrast. [apps/web/pages/cek-bapp.vue:153] (worked)
- 2026-11-13T06:58:04Z `fix`: Cek BAPP modal now keeps photo centered above a non-scrolling white control footer; verdict and previous/next buttons have readable contrast. Web build and diff check pass. [apps/web/pages/cek-bapp.vue:153]
