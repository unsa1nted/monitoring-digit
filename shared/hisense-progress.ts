// Definitions from hisense_direktorat_api.md, section 6A.
export const hisenseProgressStatuses = [
  { code: 'BARANG SIAP', label: 'Barang siap / keluar gudang', description: 'Barang sudah berangkat dari Crossdock / Factory DC.', tone: 'sky' },
  { code: 'PROSES PENGIRIMAN', label: 'Proses pengiriman', description: 'Dalam perjalanan logistik antar hub atau pelabuhan.', tone: 'sky' },
  { code: 'MENUJU ALAMAT', label: 'Menuju alamat', description: 'Dalam pengantaran ke alamat sekolah.', tone: 'sky' },
  { code: 'BARANG TIBA', label: 'Barang tiba', description: 'Sudah diterima sekolah dan siap diinstal.', tone: 'teal' },
  { code: 'PROSES INSTALASI', label: 'Proses instalasi', description: 'Teknisi sedang memasang dan mengonfigurasi perangkat.', tone: 'sky' },
  { code: 'INSTALASI SELESAI', label: 'Instalasi selesai', description: 'Pemasangan, pelatihan, dan unggah BAPP selesai; menunggu peninjauan.', tone: 'teal' },
  { code: 'REVISI', label: 'Perlu revisi', description: 'Perlu perbaikan foto, serial number, atau dokumen BAPP.', tone: 'amber' },
  { code: 'DISETUJUI', label: 'Disetujui Direktorat', description: 'Berkas dan pemasangan disetujui oleh Direktorat.', tone: 'teal' },
  { code: 'REVIU APIP', label: 'Reviu APIP', description: 'Masuk dalam peninjauan auditor APIP.', tone: 'violet' },
  { code: 'SESUAI APIP', label: 'Sesuai APIP', description: 'Berkas dan instalasi sudah diverifikasi auditor APIP.', tone: 'teal' },
  { code: 'INSTALASI TERKENDALA', label: 'Instalasi terkendala', description: 'Pemasangan tertunda karena kendala di sekolah.', tone: 'amber' },
  { code: 'INSTALASI GAGAL', label: 'Instalasi gagal', description: 'Pemasangan gagal atau dibatalkan karena kendala unit.', tone: 'red' },
  { code: 'PENGIRIMAN GAGAL', label: 'Pengiriman gagal', description: 'Pengiriman gagal atau dibatalkan (Undelivered / Void).', tone: 'red' }
] as const

export type HisenseProgressSummary = {
  // Each unique Hisense id_transaksi represents one PID unit.
  // Retain the API field name; the dashboard labels this count as Total PID.
  transactions: number
  schools: number
  missingNpsn: number
  shipped: number
  installationComplete: number
  failed: number
  constrained: number
  revision: number
  statuses: { code: string; count: number; percentage: number }[]
}

export type HisenseSchoolProgress = {
  npsn: string
  name: string
  pidCount: number
  statuses: { code: string; count: number }[]
}

export type HisenseProvinceProgress = HisenseProgressSummary & {
  key: string; name: string; mapped: boolean
  schoolDetails: HisenseSchoolProgress[]
}
export type HisenseProgressResponse = {
  source: 'SMK'
  fetchedAt: string
  cacheSeconds: number
  summary: HisenseProgressSummary
  provinces: HisenseProvinceProgress[]
}
