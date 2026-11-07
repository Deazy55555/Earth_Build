import { Kit, C } from './kit';

type Build = (k: Kit) => void;

/** A pointy boat hull facing +z, top at y = top. */
function hull(k: Kit, color: string, len: number, wid: number, depth: number, top: number) {
  k.box(color, [wid, depth, len], { at: [0, top - depth / 2, -wid * 0.25] });
  k.extrude(color, [[-wid / 2, 0], [wid / 2, 0], [0, wid * 0.9]], depth, { at: [0, top - depth / 2, len / 2 - wid * 0.25], rot: [90, 0, 0] });
}

/** Boats. y = 0 is the water line. */
export const BOATS: Record<string, Build> = {
  cruiseship(k) {
    hull(k, C.navy, 2.2, 0.5, 0.3, 0.15);
    k.box(C.white, [0.52, 0.03, 2.0], { at: [0, 0.16, -0.12] });
    const decks = [[0.48, 1.7], [0.44, 1.5], [0.4, 1.3], [0.34, 1.0], [0.28, 0.6]];
    let y = 0.17;
    decks.forEach(([w, l], i) => {
      k.box(C.white, [w, 0.12, l], { at: [0, y + 0.06, -0.2 + i * 0.04] });
      k.box('#5fb8ee', [w + 0.005, 0.03, l * 0.92], { at: [0, y + 0.07, -0.2 + i * 0.04] });
      y += 0.12;
    });
    for (const z of [-0.35, -0.05]) {
      k.cyl(C.red, 0.06, 0.07, 0.22, { at: [0, y + 0.1, z] }, 8);
      k.cyl(C.black, 0.062, 0.062, 0.04, { at: [0, y + 0.2, z] }, 8);
    }
    for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) k.box(C.orange, [0.06, 0.06, 0.16], { at: [sx * 0.27, 0.3, -0.75 + i * 0.3] });
    k.box('#3fd0e8', [0.16, 0.02, 0.3], { at: [0, y + 0.01, 0.35] });
    // a little water slide!
    k.torus(C.yellow, 0.12, 0.02, { at: [0.1, y + 0.1, -0.7], rot: [0, 90, 0] }, Math.PI * 1.5, 10);
  },
  carrier(k) {
    const g = '#8a939e';
    hull(k, g, 2.4, 0.42, 0.3, 0.15);
    k.box('#59616b', [0.62, 0.04, 2.3], { at: [0.06, 0.17, -0.1] });
    k.box(C.white, [0.01, 0.005, 1.6], { at: [0.06, 0.195, -0.2] });
    k.box(C.yellow, [0.01, 0.005, 1.0], { at: [-0.08, 0.195, 0.1], rot: [0, -9, 0] });
    // island tower
    k.box(g, [0.12, 0.3, 0.35], { at: [0.3, 0.34, -0.2] });
    k.box('#2d3b4a', [0.125, 0.04, 0.3], { at: [0.3, 0.42, -0.2] });
    k.box(g, [0.06, 0.15, 0.06], { at: [0.3, 0.56, -0.2] });
    // jets
    const jet = (x: number, z: number, r: number) => {
      k.box('#b8c2cc', [0.05, 0.04, 0.24], { at: [x, 0.22, z], rot: [0, r, 0] });
      k.box('#b8c2cc', [0.22, 0.015, 0.08], { at: [x, 0.21, z - 0.02], rot: [0, r, 0] });
      k.box('#b8c2cc', [0.1, 0.012, 0.04], { at: [x, 0.215, z - 0.11], rot: [0, r, 0] });
    };
    jet(-0.12, 0.55, 0);
    jet(0.05, 0.75, 0);
    jet(-0.15, -0.5, 30);
    jet(-0.15, -0.75, 30);
    jet(0.1, -0.85, 0);
    k.layer('radar', [0.3, 0.66, -0.2]);
    k.box('#d0d6dc', [0.18, 0.03, 0.03], { at: [0.3, 0.66, -0.2] });
  },
  submarine(k) {
    const b = '#2c3440';
    k.ball(b, 0.3, { at: [0, 0.0, 0], scale: [1, 0.9, 4] }, 2);
    k.box(b, [0.14, 0.32, 0.4], { at: [0, 0.38, 0.2] });
    for (const sx of [-1, 1]) k.box(b, [0.25, 0.02, 0.1], { at: [sx * 0.12, 0.42, 0.25] });
    k.cyl(C.grey, 0.015, 0.015, 0.25, { at: [0, 0.65, 0.25] }, 5);
    k.box(C.grey, [0.03, 0.03, 0.08], { at: [0, 0.78, 0.28] });
    k.box(b, [0.5, 0.02, 0.12], { at: [0, 0.0, -1.05] });
    k.box(b, [0.02, 0.4, 0.12], { at: [0, 0.0, -1.05] });
    k.box(C.yellow, [0.1, 0.02, 0.1], { at: [0, 0.27, -0.3] });
  },
  containership(k) {
    hull(k, '#c8423f', 2.4, 0.5, 0.3, 0.15);
    k.box('#2d3b4a', [0.52, 0.03, 2.2], { at: [0, 0.16, -0.12] });
    const cols = ['#e8454f', '#3d8bff', '#ffd23f', '#2fbf71', '#ff8a3d', '#9b7bff'];
    for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) for (let l = 0; l < 2 + ((i + j) % 2); l++)
      k.box(cols[(i * 3 + j + l) % cols.length], [0.14, 0.09, 0.22], { at: [-0.16 + j * 0.16, 0.23 + l * 0.095, 0.55 - i * 0.24] });
    k.box(C.white, [0.46, 0.35, 0.22], { at: [0, 0.35, -1.0] });
    k.box('#2d3b4a', [0.47, 0.05, 0.2], { at: [0, 0.45, -1.0] });
  },
};
