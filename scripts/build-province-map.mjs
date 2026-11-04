import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

// Source: https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces
// CC BY 4.0. Coordinates projected to SVG, rounded and simplified for dashboard display.
const source = JSON.parse(readFileSync(process.argv[2], 'utf8'))
function simplify(points, tolerance = 0.3) {
  if (points.length <= 2) return points
  const a = points[0], b = points.at(-1)
  const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy
  let maximum = tolerance * tolerance, index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0
    const distance = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2
    if (distance > maximum) { maximum = distance; index = i }
  }
  return index ? [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)] : [a, b]
}
const provinces = source.features.map(feature => {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  const path = polygons.flatMap(polygon => polygon.map(ring => {
    const projected = ring.map(([lon, lat]) => [(lon - 94) * 20, (7 - lat) * 20])
    const points = simplify(projected)
    if (points.length < 4) return ''
    return 'M' + points.map(p => p.map(n => n.toFixed(1)).join(',')).join('L') + 'Z'
  })).join('')
  if (!path || /NaN|Infinity/.test(path)) throw new Error('Invalid province geometry')
  return { name: feature.properties.PROVINSI, path }
}).sort((a, b) => a.name.localeCompare(b.name, 'id'))
if (provinces.length !== 38 || new Set(provinces.map(p => p.name)).size !== 38) throw new Error('Expected 38 provinces')
mkdirSync('apps/web/assets/data', { recursive: true })
writeFileSync('apps/web/assets/data/indonesia-provinces.json', JSON.stringify(provinces))
mkdirSync('shared', { recursive: true })
writeFileSync('shared/province-names.ts', `export const provinceNames = ${JSON.stringify(provinces.map(p => p.name), null, 2)} as const\n`)
console.log(`Generated ${provinces.length} province paths`)
