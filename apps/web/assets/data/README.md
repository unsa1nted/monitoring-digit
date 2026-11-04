# Indonesia province map

`indonesia-provinces.json` contains 38 SVG province outlines derived from
[Indonesia GeoJSON & TopoJSON Maps (38 Provinces), denyherianto](https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces).
The source data is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Changes: equirectangular projection, geometry simplification and coordinate rounding for dashboard display.
This visualization is not intended for surveying or authoritative boundary decisions.

To regenerate, download `GeoJSON/indonesia-38-provinces.geojson` from that repository,
then run `node scripts/build-province-map.mjs <downloaded-file>` from the workspace root.
This also regenerates `shared/province-names.ts`. Map assets are bundled locally;
the application does not call an external map service at runtime.

Statistics come from the `schools` table, grouped by province: distinct nonempty trimmed
NPSN for schools, and SUM(jumlah_pid) for PID. Each percentage uses its own nationwide
denominator. Unknown province names remain in the denominator and are disclosed separately.
