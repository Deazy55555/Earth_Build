import { Kit, C } from './kit';

type Build = (k: Kit) => void;

/** Planes, trains, liner and balloons. All face +z (forward). */

function plane(k: Kit, tail: string, engines: 2 | 4, hump: boolean) {
  const w = C.white;
  k.cyl(w, 0.16, 0.16, 1.8, { at: [0, 0.3, 0], rot: [90, 0, 0] }, 10);
  k.cone(w, 0.16, 0.35, { at: [0, 0.3, 1.07], rot: [90, 0, 0] }, 10);
  k.cone(w, 0.16, 0.45, { at: [0, 0.34, -1.1], rot: [-90, 0, 0], scale: [1, 1, 0.7] }, 10);
  if (hump) k.ball(w, 0.15, { at: [0, 0.42, 0.55], scale: [0.95, 0.7, 2] });
  k.box('#2d3b4a', [0.01, 0.05, 1.3], { at: [0.16, 0.36, 0.1] });
  k.box('#2d3b4a', [0.01, 0.05, 1.3], { at: [-0.16, 0.36, 0.1] });
  k.box('#2d3b4a', [0.2, 0.06, 0.08], { at: [0, 0.42, 1.0] });
  // wings
  for (const sx of [-1, 1]) {
    k.box('#dfe6ee', [1.1, 0.04, 0.42], { at: [sx * 0.62, 0.25, 0.05], rot: [0, sx * -22, sx * 4] });
    k.box('#dfe6ee', [0.38, 0.03, 0.18], { at: [sx * 0.24, 0.36, -0.95], rot: [0, sx * -22, 0] });
    const xs = engines === 4 ? [0.38, 0.75] : [0.45];
    for (const x of xs) k.cyl('#b8c2cc', 0.07, 0.07, 0.28, { at: [sx * x, 0.17, 0.22 - x * 0.2], rot: [90, 0, 0] }, 8);
  }
  k.extrude(tail, [[0, 0], [0.45, 0], [0.35, 0.5], [0.15, 0.5]], 0.04, { at: [0, 0.4, -0.85], rot: [0, -90, 0] });
}

function trainCar(k: Kit, body: string, stripe: string, roof = C.grey) {
  k.box(body, [0.42, 0.42, 1.7], { at: [0, 0.33, 0] });
  k.box(roof, [0.38, 0.06, 1.66], { at: [0, 0.57, 0] });
  k.box(stripe, [0.43, 0.06, 1.7], { at: [0, 0.24, 0] });
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) k.box('#2d3b4a', [0.01, 0.1, 0.16], { at: [sx * 0.215, 0.42, -0.65 + i * 0.26] });
  for (const z of [-0.6, 0.6]) for (const sx of [-1, 1]) k.cyl(C.black, 0.07, 0.07, 0.05, { at: [sx * 0.17, 0.08, z], rot: [0, 0, 90] }, 8);
}

export const VEHICLES: Record<string, Build> = {
  airliner(k) {
    plane(k, '#3d8bff', 2, false);
  },
  jumbo(k) {
    plane(k, '#e8454f', 4, true);
  },
  bulletnose(k) {
    k.box(C.white, [0.42, 0.42, 1.1], { at: [0, 0.33, -0.3] });
    k.extrude(C.white, [[-0.5, 0], [0.4, 0], [-0.5, 0.42]], 0.42, { at: [0, 0.12, 0.57], rot: [0, -90, 0] });
    k.box('#2a5bd7', [0.43, 0.06, 1.1], { at: [0, 0.24, -0.3] });
    k.box('#2d3b4a', [0.3, 0.1, 0.2], { at: [0, 0.48, 0.25], rot: [-35, 0, 0] });
    for (const z of [-0.6, 0.2]) for (const sx of [-1, 1]) k.cyl(C.black, 0.07, 0.07, 0.05, { at: [sx * 0.17, 0.08, z], rot: [0, 0, 90] }, 8);
  },
  bulletcar(k) {
    trainCar(k, C.white, '#2a5bd7', '#e6e9ee');
  },
  eurostarnose(k) {
    k.box('#e9ecef', [0.42, 0.42, 1.2], { at: [0, 0.33, -0.25] });
    k.extrude(C.yellow, [[-0.4, 0], [0.4, 0], [-0.4, 0.42]], 0.42, { at: [0, 0.12, 0.65], rot: [0, -90, 0] });
    k.box('#1d3b70', [0.43, 0.08, 1.2], { at: [0, 0.24, -0.25] });
    k.box('#2d3b4a', [0.3, 0.1, 0.18], { at: [0, 0.48, 0.38], rot: [-35, 0, 0] });
    for (const z of [-0.6, 0.2]) for (const sx of [-1, 1]) k.cyl(C.black, 0.07, 0.07, 0.05, { at: [sx * 0.17, 0.08, z], rot: [0, 0, 90] }, 8);
  },
  eurostarcar(k) {
    trainCar(k, '#e9ecef', '#1d3b70');
  },
  loco(k) {
    k.box(C.red, [0.44, 0.48, 1.5], { at: [0, 0.36, 0] });
    k.box('#b8323b', [0.4, 0.1, 1.4], { at: [0, 0.65, 0] });
    k.box('#2d3b4a', [0.36, 0.14, 0.02], { at: [0, 0.5, 0.76] });
    k.box(C.yellow, [0.45, 0.06, 1.5], { at: [0, 0.22, 0] });
    k.box(C.yellow, [0.3, 0.06, 0.02], { at: [0, 0.3, 0.76] });
    for (const z of [-0.5, 0, 0.5]) for (const sx of [-1, 1]) k.cyl(C.black, 0.08, 0.08, 0.05, { at: [sx * 0.18, 0.08, z], rot: [0, 0, 90] }, 8);
  },
  coach(k) {
    trainCar(k, '#2f6fb5', '#f2d24a');
  },
  silvercoach(k) {
    trainCar(k, '#c9d1da', '#e8454f');
  },
  liner(k) {
    k.box(C.black, [0.5, 0.3, 1.9], { at: [0, 0.0, -0.15] });
    k.extrude(C.black, [[-0.25, 0], [0.25, 0], [0, 0.45]], 0.3, { at: [0, 0.0, 0.8], rot: [90, 0, 0] });
    k.box(C.red, [0.51, 0.06, 1.9], { at: [0, -0.12, -0.15] });
    k.box(C.white, [0.46, 0.14, 1.5], { at: [0, 0.22, -0.2] });
    k.box(C.white, [0.4, 0.12, 1.1], { at: [0, 0.35, -0.25] });
    k.box('#2d3b4a', [0.41, 0.03, 1.0], { at: [0, 0.36, -0.25] });
    k.cyl(C.red, 0.1, 0.12, 0.28, { at: [0, 0.55, -0.35] }, 10);
    k.cyl(C.black, 0.102, 0.102, 0.06, { at: [0, 0.67, -0.35] }, 10);
  },
  balloon(k) {
    const stripes = [C.red, C.yellow, C.blue, C.orange, C.green, C.purple];
    for (let i = 0; i < 6; i++) k.ball(stripes[i], 0.55, { at: [0, 1.25, 0], rot: [0, i * 30, 0], scale: [0.18, 1.1, 1] }, 1);
    k.ball(C.red, 0.5, { at: [0, 1.28, 0], scale: [1, 1.05, 1] }, 1);
    for (let i = 0; i < 6; i++) k.ball(stripes[i], 0.51, { at: [0, 1.28, 0], rot: [0, i * 30, 0], scale: [0.25, 1.06, 1.01] }, 1);
    k.cone(C.red, 0.3, 0.35, { at: [0, 0.7, 0], rot: [180, 0, 0] }, 8);
    for (const [x, z] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) k.box(C.darkBrown, [0.015, 0.4, 0.015], { at: [x, 0.42, z] });
    k.box('#a8703f', [0.25, 0.2, 0.25], { at: [0, 0.12, 0] });
  },
};
