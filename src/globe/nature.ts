import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { boxBlurWrap, type Terrain } from './mapTextures';
import regionsTopo from '../data/geo/regions.json';

/**
 * A "what the ground really looks like" colour map: forests, savanna, deserts, tundra,
 * rock, snow and ice, with hill shading from the real elevation. Used when zoomed in close.
 */
export interface Nature {
  canvas: HTMLCanvasElement;
  /** 0..1 how deserty each spot is */
  desert: Float32Array;
  /** 0..1 tundra */
  tundra: Float32Array;
  w: number;
  h: number;
}

type RGB = [number, number, number];
const hex = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ss = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const RAINFOREST = hex('#3f9a4c');
const SAVANNA = hex('#a8c75c');
const TEMPERATE = hex('#72bd59');
const BOREAL = hex('#4f8c58');
const TUNDRA = hex('#b8bf98');
const SAND = hex('#ead08f');
const DRY = hex('#c8bd7a');
const ROCK = hex('#a99b8a');
const SNOW = hex('#f5f8fb');

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Dry grassland / scrub regions not covered by the desert outlines (soft-edged boxes). */
const ARID: [number, number, number, number][] = [
  // [lat0, lat1, lon0, lon1]
  [31, 46, -121, -103], // US Great Basin, Colorado Plateau, Great Plains edge
  [22, 31, -112, -98], // northern Mexico
  [36, 52, 46, 118], // Central Asian steppe
  [25, 38, 44, 70], // Iran, Afghanistan, Iraq
  [-33, -17, 118, 146], // inner Australia
  [-50, -37, -72, -63], // Patagonia
  [11, 18, -17, 40], // Sahel
  [-25, -16, 13, 26], // Kalahari edges
];
export function aridity(lat: number, lon: number): number {
  let a = 0;
  for (const [la0, la1, lo0, lo1] of ARID) {
    const fy = Math.min(lat - la0, la1 - lat) / 2.5;
    const fx = Math.min(lon - lo0, lo1 - lon) / 2.5;
    a = Math.max(a, Math.min(1, Math.max(0, Math.min(fx, fy))));
  }
  return a;
}

function rasterize(kind: string, w: number, h: number, blur: number): Float32Array {
  const topo = regionsTopo as unknown as Topology<{ [k: string]: GeometryCollection<{ FEATURECLA: string }> }>;
  const key = Object.keys(topo.objects)[0];
  const fc = feature(topo, topo.objects[key]);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const path = geoPath(geoEquirectangular().scale(w / (2 * Math.PI)).translate([w / 2, h / 2]), ctx);
  ctx.fillStyle = '#fff';
  for (const f of fc.features as Feature<Geometry, { FEATURECLA: string }>[]) {
    if (f.properties.FEATURECLA !== kind) continue;
    ctx.beginPath();
    path(f);
    ctx.fill();
  }
  const px = ctx.getImageData(0, 0, w, h).data;
  let a: Float32Array = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = px[i * 4] / 255;
  a = boxBlurWrap(a, w, h, blur);
  return boxBlurWrap(a, w, h, blur);
}

export function buildNature(t: Terrain): Nature {
  const { w, h } = t;
  const smooth = boxBlurWrap(t.elev, w, h, 1);
  const desert = rasterize('Desert', w, h, 4);
  const tundra = rasterize('Tundra', w, h, 6);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const lat = 90 - ((y + 0.5) / h) * 180;
    const al = Math.abs(lat);
    // climate bands
    let c: RGB = RAINFOREST;
    c = mix(c, SAVANNA, ss(9, 17, al));
    c = mix(c, TEMPERATE, ss(26, 34, al));
    c = mix(c, BOREAL, ss(50, 58, al));
    c = mix(c, TUNDRA, ss(64, 70, al));
    const band = c;
    // snow line: only the very highest peaks near the tropics (Everest, not the Tibetan plateau),
    // dropping fast through the mid-latitudes so the Alps get white tops
    const snowLine = 0.9 - 0.55 * ss(34, 47, al) - 0.17 * ss(47, 66, al);
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // (sea pixels get colours too, so crisp coastlines can be cut out later without gaps)
      const e = t.elev[i];
      const lon = ((x + 0.5) / w) * 360 - 180;
      let col = mix(band, DRY, aridity(lat, lon) * 0.85);
      col = mix(col, SAND, Math.min(1, desert[i] * 1.6));
      col = mix(col, TUNDRA, Math.min(1, tundra[i] * 1.3) * 0.8);
      col = mix(col, ROCK, ss(0.3, 0.6, e) * 0.85);
      col = mix(col, SNOW, ss(snowLine - 0.06, snowLine + 0.04, e));
      // polar ice: Antarctica and the Greenland ice sheet
      if (lat < -62 || (lat > 60 && e > 0.22 && x > w * 0.28 && x < w * 0.42)) col = mix(col, SNOW, 0.92);
      // patchy variety
      const n = 0.9 + 0.2 * (0.6 * noise(x * 0.08, y * 0.08) + 0.4 * noise(x * 0.31, y * 0.31));
      // hill shading, light from the north-west
      const xr = (x + 1) % w;
      const yd = Math.min(h - 1, y + 1);
      const es = smooth[i];
      const dzdx = smooth[y * w + xr] - es;
      const dzdy = smooth[yd * w + x] - es;
      const shade = Math.min(1.3, Math.max(0.7, 1 + (-dzdx + dzdy) * 9));
      const k = n * shade;
      d[i * 4] = Math.min(255, col[0] * k);
      d[i * 4 + 1] = Math.min(255, col[1] * k);
      d[i * 4 + 2] = Math.min(255, col[2] * k);
      d[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, desert, tundra, w, h };
}
