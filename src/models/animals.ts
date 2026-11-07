import { Kit, C, type V3 } from './kit';

type Build = (k: Kit) => void;

interface Quad {
  body: string;
  belly?: string;
  len?: number; // body length (z)
  wid?: number;
  hgt?: number; // body thickness
  legH?: number;
  legW?: number;
  legColor?: string;
  head?: string;
  headSize?: V3;
  headAt?: V3; // relative to front of body top
  neck?: { len: number; tilt: number; r: number };
  tail?: { len: number; r: number; tilt: number; color?: string };
  ears?: { size: number; color?: string };
  eyes?: boolean;
}

/** A chunky four-legged animal facing +z. Returns handy positions for extras. */
function quad(k: Kit, q: Quad) {
  const len = q.len ?? 1.0;
  const wid = q.wid ?? 0.5;
  const hgt = q.hgt ?? 0.45;
  const legH = q.legH ?? 0.45;
  const legW = q.legW ?? 0.14;
  const bodyY = legH + hgt / 2;
  k.box(q.body, [wid, hgt, len], { at: [0, bodyY, 0] });
  if (q.belly) k.box(q.belly, [wid * 0.8, 0.04, len * 0.8], { at: [0, legH + 0.01, 0] });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) k.box(q.legColor ?? q.body, [legW, legH, legW], { at: [sx * (wid / 2 - legW / 2), legH / 2, sz * (len / 2 - legW / 2 - 0.02)] });

  // neck + head
  let headBase: V3 = [0, bodyY + hgt * 0.25, len / 2];
  if (q.neck) {
    const t = (q.neck.tilt * Math.PI) / 180;
    const nl = q.neck.len;
    const cy = bodyY + hgt * 0.2 + Math.cos(t) * nl * 0.5;
    const cz = len / 2 - 0.05 + Math.sin(t) * nl * 0.5;
    k.box(q.body, [q.neck.r, nl, q.neck.r], { at: [0, cy, cz], rot: [q.neck.tilt, 0, 0] });
    headBase = [0, bodyY + hgt * 0.2 + Math.cos(t) * nl, len / 2 - 0.05 + Math.sin(t) * nl];
  }
  const hs = q.headSize ?? [0.32, 0.3, 0.36];
  const off = q.headAt ?? [0, 0.05, 0.12];
  const head: V3 = [headBase[0] + off[0], headBase[1] + off[1], headBase[2] + off[2]];
  k.box(q.head ?? q.body, hs, { at: head });
  if (q.eyes !== false)
    for (const sx of [-1, 1]) k.box(C.black, [0.05, 0.05, 0.03], { at: [sx * hs[0] * 0.3, head[1] + hs[1] * 0.15, head[2] + hs[2] / 2] });
  if (q.ears)
    for (const sx of [-1, 1]) k.box(q.ears.color ?? q.body, [q.ears.size, q.ears.size, 0.04], { at: [sx * (hs[0] / 2), head[1] + hs[1] / 2, head[2] - hs[2] * 0.2] });
  if (q.tail) {
    const t = q.tail;
    const a = (t.tilt * Math.PI) / 180;
    k.box(t.color ?? q.body, [t.r, t.len, t.r], {
      at: [0, bodyY + hgt * 0.2 - Math.cos(a) * t.len * 0.5, -len / 2 - Math.sin(a) * t.len * 0.5],
      rot: [-t.tilt, 0, 0],
    });
  }
  return { head, hs, bodyY, len, wid, hgt, legH };
}

const stripes = (k: Kit, color: string, n: number, wid: number, hgt: number, len: number, y: number) => {
  for (let i = 0; i < n; i++) k.box(color, [wid + 0.01, hgt * 0.75, 0.05], { at: [0, y + hgt * 0.1, -len / 2 + ((i + 0.5) * len) / n] });
};

const spots = (k: Kit, color: string, wid: number, y: number, len: number, n: number) => {
  for (let i = 0; i < n; i++) {
    const z = -len / 2 + 0.1 + ((i * 0.37) % 1) * (len - 0.2);
    const s = i % 2 ? 1 : -1;
    k.box(color, [0.02, 0.09, 0.09], { at: [s * (wid / 2 + 0.005), y + ((i * 0.53) % 1 - 0.5) * 0.25, z] });
    k.box(color, [0.09, 0.02, 0.09], { at: [((i * 0.29) % 1 - 0.5) * wid * 0.8, y + 0.2, z * 0.9] });
  }
};

const tree = (k: Kit, x: number, z: number, h = 1.2, leaf = C.darkGreen) => {
  k.cyl(C.brown, 0.05, 0.07, h, { at: [x, h / 2, z] }, 6);
  k.ball(leaf, 0.35, { at: [x, h + 0.15, z] });
};

export const ANIMALS: Record<string, Build> = {
  giraffe(k) {
    const g = '#f2b84b';
    const r = quad(k, { body: g, len: 0.9, wid: 0.42, hgt: 0.4, legH: 0.9, legW: 0.1, neck: { len: 1.1, tilt: 18, r: 0.15 }, headSize: [0.18, 0.18, 0.34], headAt: [0, 0.02, 0.1], tail: { len: 0.4, r: 0.04, tilt: 15 } });
    spots(k, '#a8652c', 0.42, r.bodyY, 0.9, 8);
    for (const sx of [-1, 1]) k.cyl(C.darkBrown, 0.02, 0.02, 0.14, { at: [sx * 0.05, r.head[1] + 0.15, r.head[2] - 0.08] }, 4);
  },
  elephant(k) {
    const g = '#9aa3b0';
    const r = quad(k, { body: g, len: 1.1, wid: 0.75, hgt: 0.75, legH: 0.55, legW: 0.24, headSize: [0.5, 0.5, 0.4], headAt: [0, 0.15, 0.15], tail: { len: 0.35, r: 0.04, tilt: 10 } });
    for (const sx of [-1, 1]) k.box('#8a93a1', [0.05, 0.45, 0.4], { at: [sx * 0.33, r.head[1], r.head[2] - 0.05], rot: [0, sx * 25, 0] });
    k.cyl(g, 0.06, 0.1, 0.6, { at: [0, r.head[1] - 0.35, r.head[2] + 0.22], rot: [-15, 0, 0] }, 6);
    for (const sx of [-1, 1]) k.cone(C.cream, 0.04, 0.25, { at: [sx * 0.13, r.head[1] - 0.2, r.head[2] + 0.28], rot: [70, 0, 0] }, 5);
  },
  lion(k) {
    const g = '#e2a64b';
    const r = quad(k, { body: g, len: 0.95, wid: 0.42, hgt: 0.38, legH: 0.38, legW: 0.12, headSize: [0.3, 0.28, 0.28], headAt: [0, 0.12, 0.1], tail: { len: 0.55, r: 0.05, tilt: 40 } });
    k.box('#9b5a24', [0.52, 0.5, 0.2], { at: [0, r.head[1] - 0.02, r.head[2] - 0.08] });
    k.box('#f0c27a', [0.14, 0.1, 0.08], { at: [0, r.head[1] - 0.07, r.head[2] + 0.15] });
    k.ball('#9b5a24', 0.07, { at: [0, r.bodyY - 0.15, -0.95] });
  },
  zebra(k) {
    const r = quad(k, { body: C.white, len: 0.9, wid: 0.36, hgt: 0.38, legH: 0.5, legW: 0.1, neck: { len: 0.4, tilt: 35, r: 0.16 }, headSize: [0.18, 0.2, 0.38], tail: { len: 0.4, r: 0.04, tilt: 15, color: C.black }, ears: { size: 0.08 } });
    stripes(k, C.black, 6, 0.36, 0.38, 0.9, r.bodyY);
    k.box(C.black, [0.04, 0.2, 0.4], { at: [0, r.bodyY + 0.42, 0.55], rot: [35, 0, 0] });
  },
  hippo(k) {
    const g = '#9e8aa7';
    const r = quad(k, { body: g, len: 1.1, wid: 0.7, hgt: 0.55, legH: 0.22, legW: 0.2, headSize: [0.5, 0.36, 0.5], headAt: [0, -0.05, 0.2], ears: { size: 0.07 } });
    k.box('#c6a6b5', [0.46, 0.08, 0.1], { at: [0, r.head[1] - 0.08, r.head[2] + 0.26] });
    k.box('#4aa3e0', [1.8, 0.05, 1.6], { at: [0, 0.03, 0] });
  },
  gorilla(k) {
    const d = '#3c3c44';
    k.box(d, [0.7, 0.75, 0.5], { at: [0, 0.75, 0] });
    k.box('#55555f', [0.4, 0.5, 0.05], { at: [0, 0.7, 0.26] });
    k.box(d, [0.36, 0.34, 0.34], { at: [0, 1.28, 0.1] });
    k.box('#57575f', [0.24, 0.16, 0.06], { at: [0, 1.22, 0.29] });
    for (const sx of [-1, 1]) {
      k.box(C.black, [0.05, 0.05, 0.02], { at: [sx * 0.07, 1.33, 0.28] });
      k.box(d, [0.18, 0.8, 0.18], { at: [sx * 0.45, 0.42, 0.15], rot: [10, 0, sx * 8] });
      k.box(d, [0.2, 0.4, 0.22], { at: [sx * 0.2, 0.2, -0.05] });
    }
    tree(k, -0.9, -0.5, 1.0);
  },
  panda(k) {
    const r = quad(k, { body: C.white, len: 0.8, wid: 0.6, hgt: 0.5, legH: 0.3, legW: 0.2, legColor: C.black, headSize: [0.46, 0.4, 0.38], headAt: [0, 0.18, 0.05], ears: { size: 0.13, color: C.black }, eyes: false });
    k.box(C.black, [0.61, 0.2, 0.25], { at: [0, r.bodyY + 0.05, 0.25] });
    for (const sx of [-1, 1]) {
      k.box(C.black, [0.12, 0.12, 0.03], { at: [sx * 0.11, r.head[1] + 0.03, r.head[2] + 0.19] });
      k.box(C.white, [0.04, 0.04, 0.02], { at: [sx * 0.11, r.head[1] + 0.04, r.head[2] + 0.21] });
    }
    k.box(C.black, [0.08, 0.06, 0.03], { at: [0, r.head[1] - 0.08, r.head[2] + 0.2] });
    for (let i = 0; i < 4; i++) k.cyl('#7ccf5a', 0.03, 0.03, 1.2 + (i % 2) * 0.3, { at: [-0.75 + i * 0.12, 0.65, -0.4 + (i % 2) * 0.15] }, 5);
  },
  tiger(k) {
    const o = '#f08a2a';
    const r = quad(k, { body: o, len: 1.0, wid: 0.42, hgt: 0.38, legH: 0.38, legW: 0.12, headSize: [0.32, 0.3, 0.3], headAt: [0, 0.08, 0.1], ears: { size: 0.08 }, tail: { len: 0.6, r: 0.05, tilt: 50 } });
    stripes(k, C.black, 7, 0.42, 0.38, 1.0, r.bodyY);
    k.box(C.white, [0.2, 0.12, 0.05], { at: [0, r.head[1] - 0.08, r.head[2] + 0.15] });
  },
  kangaroo(k) {
    const b = '#c98a54';
    k.box(b, [0.4, 0.75, 0.45], { at: [0, 0.75, 0], rot: [-20, 0, 0] });
    k.box('#e4b88a', [0.3, 0.4, 0.05], { at: [0, 0.65, 0.22], rot: [-20, 0, 0] });
    k.box(b, [0.22, 0.24, 0.32], { at: [0, 1.25, 0.25] });
    for (const sx of [-1, 1]) {
      k.box(b, [0.07, 0.22, 0.05], { at: [sx * 0.07, 1.47, 0.18] });
      k.box(C.black, [0.04, 0.04, 0.02], { at: [sx * 0.06, 1.3, 0.42] });
      k.box(b, [0.14, 0.32, 0.4], { at: [sx * 0.15, 0.22, 0.05] });
      k.box(b, [0.12, 0.06, 0.4], { at: [sx * 0.15, 0.03, 0.2] });
      k.box(b, [0.06, 0.28, 0.06], { at: [sx * 0.12, 0.8, 0.3], rot: [40, 0, 0] });
    }
    k.box(b, [0.12, 0.12, 0.8], { at: [0, 0.3, -0.55], rot: [-20, 0, 0] });
    k.box('#a8703f', [0.1, 0.1, 0.1], { at: [0, 0.82, 0.3] });
  },
  koala(k) {
    tree(k, 0, -0.15, 1.6, '#6fb563');
    const g = '#a7a9b0';
    k.box(g, [0.36, 0.42, 0.3], { at: [0, 0.95, 0.12] });
    k.box(g, [0.36, 0.32, 0.3], { at: [0, 1.32, 0.15] });
    for (const sx of [-1, 1]) {
      k.ball('#c9cbd1', 0.12, { at: [sx * 0.2, 1.48, 0.12] });
      k.box(g, [0.1, 0.1, 0.3], { at: [sx * 0.14, 1.05, 0.02] });
      k.box(C.black, [0.04, 0.04, 0.02], { at: [sx * 0.08, 1.36, 0.31] });
    }
    k.box('#3a3a40', [0.1, 0.12, 0.06], { at: [0, 1.28, 0.32] });
  },
  penguins(k) {
    k.cyl(C.snow, 1.1, 1.15, 0.1, { at: [0, 0.05, 0] }, 12);
    const p = (x: number, z: number, s: number) => {
      k.box('#24283a', [0.3 * s, 0.6 * s, 0.26 * s], { at: [x, 0.1 + 0.3 * s, z] });
      k.box(C.white, [0.22 * s, 0.45 * s, 0.03], { at: [x, 0.1 + 0.27 * s, z + 0.13 * s] });
      k.box('#24283a', [0.22 * s, 0.2 * s, 0.22 * s], { at: [x, 0.1 + 0.7 * s, z] });
      k.box(C.yellow, [0.2 * s, 0.07 * s, 0.03], { at: [x, 0.1 + 0.58 * s, z + 0.13 * s] });
      k.cone(C.orange, 0.04 * s, 0.12 * s, { at: [x, 0.1 + 0.68 * s, z + 0.16 * s], rot: [90, 0, 0] }, 4);
      for (const sx of [-1, 1]) k.box('#24283a', [0.04, 0.3 * s, 0.12 * s], { at: [x + sx * 0.17 * s, 0.1 + 0.35 * s, z], rot: [0, 0, sx * 12] });
    };
    p(0, 0, 1.2);
    p(-0.5, -0.3, 1);
    p(0.5, -0.2, 1.05);
    p(0.25, 0.45, 0.6);
  },
  polarbear(k) {
    k.cyl(C.ice, 1.0, 1.05, 0.1, { at: [0, 0.05, 0] }, 8);
    quad(k, { body: '#f4f1e8', len: 0.95, wid: 0.5, hgt: 0.45, legH: 0.35, legW: 0.16, headSize: [0.28, 0.26, 0.36], headAt: [0, 0.0, 0.12], ears: { size: 0.07 } });
  },
  moose(k) {
    const b = '#6b4a35';
    const r = quad(k, { body: b, len: 1.0, wid: 0.45, hgt: 0.5, legH: 0.7, legW: 0.11, neck: { len: 0.3, tilt: 45, r: 0.22 }, headSize: [0.22, 0.24, 0.5], headAt: [0, -0.02, 0.15], ears: { size: 0.08 } });
    for (const sx of [-1, 1]) k.box('#d8c7a0', [0.35, 0.04, 0.22], { at: [sx * 0.25, r.head[1] + 0.2, r.head[2] - 0.12], rot: [0, 0, sx * 20] });
  },
  brownbear(k) {
    k.box('#4aa3e0', [1.8, 0.04, 0.6], { at: [0, 0.02, 0.6] });
    const r = quad(k, { body: '#7a4e2d', len: 0.9, wid: 0.55, hgt: 0.5, legH: 0.35, legW: 0.17, headSize: [0.32, 0.3, 0.32], headAt: [0, 0.05, 0.1], ears: { size: 0.08 } });
    k.box('#a3754e', [0.14, 0.1, 0.1], { at: [0, r.head[1] - 0.06, r.head[2] + 0.18] });
    k.box('#e8806a', [0.06, 0.08, 0.3], { at: [0.05, r.head[1] - 0.1, r.head[2] + 0.28], rot: [0, 30, 0] });
  },
  llama(k) {
    const r = quad(k, { body: '#f3ead8', len: 0.75, wid: 0.36, hgt: 0.38, legH: 0.5, legW: 0.1, neck: { len: 0.6, tilt: 8, r: 0.15 }, headSize: [0.18, 0.18, 0.3], ears: { size: 0.1 }, tail: { len: 0.15, r: 0.08, tilt: 20 } });
    k.box(C.red, [0.38, 0.06, 0.5], { at: [0, r.bodyY + 0.2, 0] });
    k.box(C.yellow, [0.38, 0.04, 0.5], { at: [0, r.bodyY + 0.24, 0] });
  },
  jaguar(k) {
    const y = '#f2b94a';
    const r = quad(k, { body: y, len: 1.0, wid: 0.4, hgt: 0.35, legH: 0.34, legW: 0.11, headSize: [0.3, 0.26, 0.3], headAt: [0, 0.06, 0.1], ears: { size: 0.07 }, tail: { len: 0.6, r: 0.05, tilt: 60 } });
    spots(k, '#3a2a1e', 0.4, r.bodyY, 1.0, 12);
  },
  sloth(k) {
    k.cyl(C.brown, 0.06, 0.06, 2.0, { at: [0, 1.4, 0], rot: [0, 0, 90] }, 6);
    for (const x of [-0.9, 0.9]) k.cyl(C.darkBrown, 0.07, 0.09, 1.4, { at: [x, 0.7, 0] }, 6);
    const g = '#9b8a6e';
    k.box(g, [0.6, 0.3, 0.3], { at: [0, 1.05, 0] });
    for (const sx of [-1, 1]) k.box(g, [0.08, 0.35, 0.08], { at: [sx * 0.22, 1.22, 0], rot: [0, 0, sx * -15] });
    k.box(g, [0.24, 0.22, 0.22], { at: [0.38, 0.98, 0.05] });
    k.box('#d9c9a8', [0.16, 0.12, 0.03], { at: [0.38, 0.97, 0.17] });
    for (const sx of [-1, 1]) k.box(C.black, [0.05, 0.03, 0.02], { at: [0.38 + sx * 0.05, 1.0, 0.19] });
    k.ball(C.darkGreen, 0.3, { at: [-0.9, 1.5, 0] });
    k.ball(C.darkGreen, 0.3, { at: [0.9, 1.5, 0] });
  },
  toucan(k) {
    k.cyl(C.brown, 0.05, 0.05, 1.2, { at: [0, 0.4, 0], rot: [0, 0, 90] }, 6);
    k.cyl(C.darkBrown, 0.06, 0.08, 0.4, { at: [-0.4, 0.2, 0] }, 6);
    k.box(C.black, [0.25, 0.45, 0.25], { at: [0, 0.72, 0] });
    k.box(C.white, [0.2, 0.15, 0.03], { at: [0, 0.82, 0.13] });
    k.box(C.black, [0.22, 0.2, 0.22], { at: [0, 1.02, 0] });
    k.box(C.orange, [0.14, 0.12, 0.42], { at: [0, 1.0, 0.3] });
    k.box(C.yellow, [0.14, 0.04, 0.42], { at: [0, 1.07, 0.3] });
    k.box(C.red, [0.14, 0.12, 0.06], { at: [0, 0.99, 0.5] });
    k.box(C.black, [0.12, 0.25, 0.08], { at: [0, 0.5, -0.17], rot: [-30, 0, 0] });
    k.ball(C.darkGreen, 0.4, { at: [0.5, 0.8, -0.4] });
  },
  camel(k) {
    const c = '#d6a565';
    const r = quad(k, { body: c, len: 1.0, wid: 0.42, hgt: 0.42, legH: 0.75, legW: 0.11, neck: { len: 0.6, tilt: 50, r: 0.15 }, headSize: [0.18, 0.18, 0.36], headAt: [0, 0.05, 0.12], tail: { len: 0.3, r: 0.04, tilt: 10 } });
    k.ball(c, 0.28, { at: [0, r.bodyY + 0.24, 0], scale: [0.8, 1, 1] });
    k.cyl(C.sand, 1.2, 1.3, 0.06, { at: [0, 0.03, 0] }, 10);
  },
  orangutan(k) {
    tree(k, -0.4, -0.3, 1.8, C.darkGreen);
    const o = '#c45a26';
    k.box(o, [0.45, 0.5, 0.35], { at: [0.05, 1.1, 0] });
    k.box(o, [0.3, 0.3, 0.3], { at: [0.05, 1.5, 0.05] });
    k.box('#e0a07a', [0.2, 0.18, 0.05], { at: [0.05, 1.47, 0.22] });
    for (const sx of [-1, 1]) k.box(C.black, [0.04, 0.04, 0.02], { at: [0.05 + sx * 0.05, 1.52, 0.25] });
    k.box(o, [0.1, 0.8, 0.1], { at: [-0.25, 1.5, 0.0], rot: [0, 0, -30] });
    k.box(o, [0.1, 0.7, 0.1], { at: [0.35, 0.95, 0.0], rot: [0, 0, 20] });
    k.box(o, [0.12, 0.35, 0.12], { at: [0, 0.75, 0.1] });
  },
  lemur(k) {
    const g = '#a8a2a0';
    const r = quad(k, { body: g, len: 0.6, wid: 0.3, hgt: 0.28, legH: 0.25, legW: 0.08, headSize: [0.22, 0.2, 0.24], headAt: [0, 0.1, 0.05], ears: { size: 0.07 } });
    k.box(C.white, [0.16, 0.1, 0.05], { at: [0, r.head[1] - 0.04, r.head[2] + 0.11] });
    for (let i = 0; i < 10; i++)
      k.box(i % 2 ? C.white : C.black, [0.09, 0.12, 0.09], { at: [0, r.bodyY + 0.05 + i * 0.11, -0.36 - Math.sin(i * 0.25) * 0.15] });
  },
  kiwi(k) {
    k.cyl(C.leaf, 0.9, 0.95, 0.08, { at: [0, 0.04, 0] }, 10);
    k.ball('#8a6a48', 0.4, { at: [0, 0.45, 0], scale: [1, 0.9, 1.15] });
    k.ball('#8a6a48', 0.17, { at: [0, 0.62, 0.38] });
    k.cyl('#e8d3a8', 0.015, 0.03, 0.5, { at: [0, 0.48, 0.72], rot: [100, 0, 0] }, 5);
    for (const sx of [-1, 1]) {
      k.box(C.black, [0.04, 0.04, 0.02], { at: [sx * 0.08, 0.66, 0.53] });
      k.box('#e8b04a', [0.05, 0.2, 0.05], { at: [sx * 0.15, 0.12, 0] });
    }
  },
  komodo(k) {
    const g = '#7c7f5e';
    k.box(g, [0.4, 0.22, 1.0], { at: [0, 0.28, 0] });
    k.box(g, [0.26, 0.18, 0.35], { at: [0, 0.3, 0.65] });
    k.box('#ffb0a0', [0.04, 0.02, 0.18], { at: [0, 0.26, 0.9] });
    k.box(g, [0.18, 0.12, 0.8], { at: [0, 0.22, -0.85], rot: [5, 0, 0] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(g, [0.22, 0.12, 0.12], { at: [sx * 0.28, 0.12, sz * 0.32], rot: [0, 0, sx * 30] });
    for (const sx of [-1, 1]) k.box(C.black, [0.03, 0.04, 0.04], { at: [sx * 0.13, 0.36, 0.72] });
    k.cyl(C.sand, 1.2, 1.25, 0.06, { at: [0, 0.03, 0] }, 10);
  },
  bison(k) {
    const b = '#5a3b26';
    const r = quad(k, { body: b, len: 1.0, wid: 0.55, hgt: 0.5, legH: 0.4, legW: 0.14, headSize: [0.36, 0.36, 0.3], headAt: [0, -0.1, 0.1], tail: { len: 0.3, r: 0.04, tilt: 10 } });
    k.box('#3e2818', [0.6, 0.55, 0.45], { at: [0, r.bodyY + 0.15, 0.3] });
    for (const sx of [-1, 1]) k.cone(C.cream, 0.04, 0.16, { at: [sx * 0.22, r.head[1] + 0.15, r.head[2]], rot: [0, 0, -sx * 50] }, 5);
  },
  reindeer(k) {
    const b = '#8a6a50';
    const r = quad(k, { body: b, len: 0.85, wid: 0.36, hgt: 0.38, legH: 0.55, legW: 0.1, neck: { len: 0.35, tilt: 35, r: 0.16 }, headSize: [0.18, 0.2, 0.32], tail: { len: 0.12, r: 0.08, tilt: 10, color: C.white } });
    for (const sx of [-1, 1]) {
      k.box('#e8dcc0', [0.03, 0.4, 0.03], { at: [sx * 0.1, r.head[1] + 0.3, r.head[2] - 0.08], rot: [-15, 0, sx * -15] });
      for (const h of [0.15, 0.3]) k.box('#e8dcc0', [0.03, 0.15, 0.03], { at: [sx * (0.13 + h * 0.2), r.head[1] + 0.12 + h, r.head[2] - 0.0], rot: [40, 0, sx * -10] });
    }
    k.cyl(C.snow, 1.0, 1.05, 0.06, { at: [0, 0.03, 0] }, 10);
  },
};
