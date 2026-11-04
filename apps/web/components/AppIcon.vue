<script setup lang="ts">
import {
  LuArrowLeft, LuArrowRight, LuBell, LuChartColumn, LuChevronLeft, LuChevronRight,
  LuCommand, LuEllipsisVertical, LuExternalLink, LuHand, LuHistory, LuHouse,
  LuLoaderCircle, LuLogIn, LuLogOut, LuUsers, LuMenu, LuMonitor, LuPlus, LuRefreshCw, LuSchool,
  LuSearch, LuTruck, LuX, LuPrinter, LuScanBarcode, LuPackage, LuSave, LuArrowLeftRight
} from '@kalimahapps/vue-icons/lu'

const icons = {
  'arrow-left': LuArrowLeft, 'arrow-right': LuArrowRight, bell: LuBell,
  chart: LuChartColumn, 'chevron-left': LuChevronLeft, 'chevron-right': LuChevronRight,
  command: LuCommand, more: LuEllipsisVertical, external: LuExternalLink,
  hand: LuHand, history: LuHistory, home: LuHouse, loading: LuLoaderCircle,
  login: LuLogIn, logout: LuLogOut, users: LuUsers, menu: LuMenu, monitor: LuMonitor, plus: LuPlus,
  refresh: LuRefreshCw, school: LuSchool, search: LuSearch, truck: LuTruck, close: LuX,
  printer: LuPrinter, scan: LuScanBarcode, package: LuPackage, save: LuSave, switch: LuArrowLeftRight
}
defineProps<{ name: keyof typeof icons }>()
</script>

<template>
  <span class="app-icon inline-flex shrink-0 items-center justify-center align-middle" aria-hidden="true">
    <component :is="icons[name]" focusable="false" />
  </span>
</template>

<style scoped>
:where(.app-icon) { width: 1.25rem; height: 1.25rem; }
.app-icon :deep(svg) { display: block; width: 100%; height: 100%; }
</style>
