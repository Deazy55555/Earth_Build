// Checks that ships stay on water and trains stay on land. Run: npx tsx scripts/check-routes.ts
import { feature } from 'topojson-client';
import { geoContains, geoInterpolate, geoArea } from 'd3-geo';
import world from 'world-atlas/land-10m.json';
import { ROUTES } from '../src/data/routes';

const topo = world as never as Parameters<typeof feature>[0];
const raw = feature(topo, (world as never as { objects: { land: never } }).objects.land) as never as {
  features?: { geometry: { type: string; coordinates: number[][][][] } }[];
  geometry?: { type: string; coordinates: number[][][][] };
};
// flip any inside-out polygons (they would cover the whole planet)
const geom = raw.geometry ?? raw.features![0].geometry;
const polys = geom.coordinates.map((rings) => {
  const poly = { type: 'Polygon', coordinates: rings } as never;
  return geoArea(poly) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings;
});
const land = { type: 'MultiPolygon', coordinates: polys };
const onLand = (lat: number, lon: number) => geoContains(land as never, [lon, lat]);

let problems = 0;
for (const r of ROUTES) {
  if (r.kind === 'plane' || r.kind === 'balloon') continue;
  const wantLand = r.kind === 'train';
  for (let i = 0; i < r.pts.length - 1; i++) {
    if (r.tunnels?.includes(i) || r.canals?.includes(i) || r.bridges?.includes(i)) continue;
    const [a, b] = [r.pts[i], r.pts[i + 1]];
    const interp = geoInterpolate([a[1], a[0]], [b[1], b[0]]);
    const bad: string[] = [];
    for (let t = 0.02; t < 0.99; t += 0.02) {
      const [lon, lat] = interp(t);
      if (onLand(lat, lon) !== wantLand) bad.push(`${lat.toFixed(2)},${lon.toFixed(2)}`);
    }
    if (bad.length > (wantLand ? 3 : 1)) { // allow a tiny island or two
      problems++;
      console.log(`${r.id} segment ${i} [${a}] -> [${b}]: ${bad.length} bad (${bad.slice(0, 4).join(' ')})`);
    }
  }
}
console.log(problems ? `${problems} segments to fix` : 'all routes OK');
