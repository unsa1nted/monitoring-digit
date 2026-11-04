import { provinceNames } from '../../../shared/province-names.js'

export function provinceKey(value: string) {
  const name = value.toLowerCase().replace(/^\s*pro[pv](insi)?\.?\s*/i, '').replace(/[.]/g, '').replace(/\s+/g, ' ').trim()
  const aliases: Record<string, string> = {
    'di yogyakarta': 'daerah istimewa yogyakarta', 'd i yogyakarta': 'daerah istimewa yogyakarta', yogyakarta: 'daerah istimewa yogyakarta',
    jakarta: 'dki jakarta', 'dk jakarta': 'dki jakarta', 'd k i jakarta': 'dki jakarta', 'daerah khusus ibukota jakarta': 'dki jakarta', 'daerah khusus jakarta': 'dki jakarta',
    'bangka belitung': 'kepulauan bangka belitung', 'kep bangka belitung': 'kepulauan bangka belitung', 'kep riau': 'kepulauan riau',
    'nanggroe aceh darussalam': 'aceh'
  }
  return aliases[name] ?? name
}

export function aggregateProvinceStatistics(rows: { provinsi: string; schoolCount: number; pidCount: number }[]) {
  const provinces: { name: string; schoolCount: number; pidCount: number }[] = provinceNames.map(name => ({ name, schoolCount: 0, pidCount: 0 }))
  const byKey = new Map(provinces.map(p => [provinceKey(p.name), p]))
  const unmapped: typeof provinces = []
  for (const row of rows) {
    const key = provinceKey(row.provinsi)
    let province = byKey.get(key)
    if (!province) {
      province = { name: row.provinsi.trim() || 'Provinsi belum diisi', schoolCount: 0, pidCount: 0 }
      byKey.set(key, province)
      unmapped.push(province)
    }
    province.schoolCount += Number(row.schoolCount)
    province.pidCount += Number(row.pidCount)
  }
  const all = [...provinces, ...unmapped]
  const totals = all.reduce((sum, p) => ({ schools: sum.schools + p.schoolCount, pid: sum.pid + p.pidCount }), { schools: 0, pid: 0 })
  const percentage = (p: typeof provinces[number]) => ({ ...p,
    schoolPercentage: totals.schools ? p.schoolCount / totals.schools * 100 : 0,
    pidPercentage: totals.pid ? p.pidCount / totals.pid * 100 : 0
  })
  return { totals, provinces: provinces.map(percentage), unmapped: unmapped.map(percentage) }
}
