# #0011 Cek BAPP fullscreen dialog closes when advancing photo; photo navigation must retain selected transaction and serial number.

- 2026-11-13T07:00:15Z `issue`: Cek BAPP fullscreen dialog closes when advancing photo; photo navigation must retain selected transaction and serial number. [apps/web/pages/cek-bapp.vue]
- 2026-11-13T07:04:07Z `attempt`: Replaced native dialog close behavior with controlled fullscreen overlay; photo navigation only changes index and serial-matched detail remains fixed. [apps/web/pages/cek-bapp.vue:60] (worked)
- 2026-11-13T07:04:12Z `fix`: Next/previous photo no longer invokes browser dialog closing; controlled overlay stays open and photo/detail/save require exact selected serial match. Web build and diff check pass. [apps/web/pages/cek-bapp.vue:143]
