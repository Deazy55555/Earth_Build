import { geoEquirectangular, geoPath } from 'd3-geo';
import type { Country } from './countries';

/**
 * Works out which ocean or sea each bit of water belongs to, by spreading outwards
 * from "seed" points through the water (land blocks it), with a few lines drawn
 * across open water where geographers put the borders between oceans.
 */
const W = 720;
const H = 360;

const IDS = ['', 'pacific', 'atlantic', 'indian', 'southern', 'arctic', 'mediterranean', 'black', 'caspian', 'baltic', 'caribbean'];

const SEEDS: Record<string, [number, number][]> = {
  // [lat, lon]
  pacific: [[0, -150], [20, -140], [-20, -130], [40, -150], [-40, -120], [30, 160], [0, 160], [-20, 170], [50, 170], [10, -100], [-10, -90], [20, 130], [12, 113], [35, 140], [58, -178], [-40, 170], [-5, 135]],
  atlantic: [[30, -45], [0, -25], [-30, -20], [50, -30], [45, -10], [60, -20], [20, -60], [-45, -40], [25, -90], [56, 3], [40, -65], [-10, -30]],
  caribbean: [[15, -75], [15, -82], [13, -65]],
  indian: [[-20, 80], [0, 70], [-35, 90], [10, 88], [15, 62], [-40, 60], [-30, 105], [20, 38], [27, 51], [-12, 115], [-10, 50]],
  arctic: [[85, 0], [80, 150], [75, -150], [82, -60], [75, 40], [76, 100]],
  mediterranean: [[35, 18], [38, 5], [34, 28], [40, 15]],
  black: [[43, 34]],
  caspian: [[42, 51]],
  baltic: [[57, 19], [60, 20]],
};

/** Lines across open water that the spreading can't cross ([lat, lon] points). */
const BARRIERS: [number, number][][] = [
  [[-35, 20], [-60, 20]], // Atlantic | Indian, south of Africa
  [[-44, 147], [-60, 147]], // Indian | Pacific, south of Tasmania
  [[-56, -67], [-60, -67]], // Atlantic | Pacific, Drake Passage
  [[5.6, 95.3], [-6, 105.5], [-8.5, 116], [-9.5, 124], [-13.8, 126.8]], // Indian | Pacific, along Indonesia
  [[66, -170], [66, -166]], // Pacific | Arctic, Bering Strait
];

let grid: Uint8Array | null = null;

const cell = (lat: number, lon: number) => {
  const x = Math.min(W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * W)));
  const y = Math.min(H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * H)));
  return [x, y] as const;
};

export function buildOceanGrid(list: Country[]) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const path = geoPath(geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]), ctx);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (const c of list) path(c.feature);
  ctx.fill();
  const px = ctx.getImageData(0, 0, W, H).data;

  const LAND = 255;
  const BARRIER = 254;
  const g = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (px[i * 4] > 127) g[i] = LAND;

  // everything south of 60°S is the Southern Ocean
  const southern = IDS.indexOf('southern');
  for (let y = Math.floor(((90 + 60) / 180) * H); y < H; y++)
    for (let x = 0; x < W; x++) if (g[y * W + x] === 0) g[y * W + x] = southern;

  // draw the barrier lines
  for (const line of BARRIERS) {
    for (let s = 0; s < line.length - 1; s++) {
      const [x0, y0] = cell(...line[s]);
      const [x1, y1] = cell(...line[s + 1]);
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
      for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + ((x1 - x0) * k) / n);
        const y = Math.round(y0 + ((y1 - y0) * k) / n);
        if (g[y * W + x] === 0) g[y * W + x] = BARRIER;
      }
    }
  }

  // spread from all seeds at once through water
  let frontier: number[] = [];
  for (const [id, pts] of Object.entries(SEEDS)) {
    const v = IDS.indexOf(id);
    for (const [lat, lon] of pts) {
      const [x, y] = cell(lat, lon);
      const i = y * W + x;
      if (g[i] === 0) {
        g[i] = v;
        frontier.push(i);
      }
    }
  }
  const spread = (canEnter: (i: number) => boolean, write: (i: number, v: number) => void, start: number[]) => {
    let front = start;
    const value = new Uint8Array(W * H);
    for (const i of front) value[i] = g[i];
    while (front.length) {
      const next: number[] = [];
      for (const i of front) {
        const x = i % W;
        const y = (i / W) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const j = ny * W + ((x + dx + W) % W);
            if (value[j] || !canEnter(j)) continue;
            value[j] = value[i];
            write(j, value[i]);
            next.push(j);
          }
        }
      }
      front = next;
    }
  };
  spread((j) => g[j] === 0, (j, v) => (g[j] = v), frontier);

  // leftover water (cut off by the coarse grid, or barrier cells): nearest named water
  frontier = [];
  for (let i = 0; i < W * H; i++) if (g[i] > 0 && g[i] < BARRIER) frontier.push(i);
  const leftovers = (j: number) => g[j] === 0 || g[j] === BARRIER;
  spread(() => true, (j, v) => leftovers(j) && (g[j] = v), frontier);

  for (let i = 0; i < W * H; i++) if (g[i] === BARRIER) g[i] = 0;
  grid = g;
}

/** Which ocean/sea id is at this spot, or null for land. */
export function waterAt(lon: number, lat: number): string | null {
  if (!grid) return null;
  const [x, y] = cell(lat, lon);
  const v = grid[y * W + x];
  return v > 0 && v < IDS.length ? IDS[v] : null;
}
