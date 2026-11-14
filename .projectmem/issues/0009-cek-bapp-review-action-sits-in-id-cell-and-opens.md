# #0009 Cek BAPP review action sits in ID cell and opens inline form; user needs rightmost button and fullscreen photo carousel with serial-based Hisense detail panel.

- 2026-11-13T06:39:41Z `issue`: Cek BAPP review action sits in ID cell and opens inline form; user needs rightmost button and fullscreen photo carousel with serial-based Hisense detail panel. [apps/web/pages/cek-bapp.vue:85]
- 2026-11-13T06:46:50Z `attempt`: Moved review action to sticky right table column; replaced inline form with fullscreen native dialog, photo navigation/verdicts, and serial-scoped Hisense detail endpoint. [apps/web/pages/cek-bapp.vue:90] (worked)
- 2026-11-13T06:46:55Z `fix`: Fullscreen review modal shows one Hisense photo at a time left, controls for verdict and previous/next, and serial-matched Hisense details right. Rightmost sticky table action. API/web builds and serial lookup test pass. [apps/web/pages/cek-bapp.vue:110]
