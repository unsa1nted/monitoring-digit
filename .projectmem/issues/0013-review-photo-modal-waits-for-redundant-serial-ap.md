# #0013 Review photo modal waits for redundant serial API lookup before displaying already-loaded Hisense transaction photos; optimize initial display and next-photo loading.

- 2026-11-13T07:14:41Z `issue`: Review photo modal waits for redundant serial API lookup before displaying already-loaded Hisense transaction photos; optimize initial display and next-photo loading. [apps/web/pages/cek-bapp.vue:91]
- 2026-11-13T07:16:59Z `attempt`: Removed redundant serial detail fetch on modal open; use already-scoped Hisense row for immediate photo/detail and prefetch next photo URL. [apps/web/pages/cek-bapp.vue:86] (worked)
- 2026-11-13T07:17:07Z `fix`: Photo modal no longer waits for second Hisense API search; photo loads directly from selected exact-serial row, with next photo prefetched. API/web builds and diff check pass. [apps/web/pages/cek-bapp.vue:86]
