import { Kit, C } from './kit';

type Build = (k: Kit) => void;

const dirt = (k: Kit, r = 1.1) => {
  k.cyl('#c99a6b', r, r * 1.05, 0.08, { at: [0, 0.04, 0] }, 10);
  k.box('#efe6d2', [0.35, 0.04, 0.06], { at: [-r * 0.55, 0.1, r * 0.5], rot: [0, 30, 0] });
  k.box('#efe6d2', [0.22, 0.04, 0.05], { at: [-r * 0.5, 0.1, r * 0.62], rot: [0, -40, 0] });
};

/** Two-legged dinosaur facing +z. */
function biped(k: Kit, col: string, belly: string, s = 1) {
  k.box(col, [0.5 * s, 0.5 * s, 0.9 * s], { at: [0, 0.85 * s, 0], rot: [-12, 0, 0] });
  k.box(belly, [0.4 * s, 0.05, 0.6 * s], { at: [0, 0.6 * s, 0.05 * s], rot: [-12, 0, 0] });
  k.box(col, [0.22 * s, 0.22 * s, 0.9 * s], { at: [0, 0.75 * s, -0.75 * s], rot: [12, 0, 0] });
  k.box(col, [0.12 * s, 0.12 * s, 0.5 * s], { at: [0, 0.6 * s, -1.35 * s], rot: [15, 0, 0] });
  for (const sx of [-1, 1]) {
    k.box(col, [0.16 * s, 0.5 * s, 0.24 * s], { at: [sx * 0.2 * s, 0.4 * s, -0.05 * s] });
    k.box(col, [0.14 * s, 0.35 * s, 0.14 * s], { at: [sx * 0.2 * s, 0.17 * s, 0.02 * s] });
    k.box(col, [0.16 * s, 0.05, 0.26 * s], { at: [sx * 0.2 * s, 0.03, 0.1 * s] });
  }
}

export const DINOS: Record<string, Build> = {
  trex(k) {
    dirt(k);
    const g = '#5f9a4c';
    biped(k, g, '#c9d98f');
    k.box(g, [0.36, 0.4, 0.6], { at: [0, 1.35, 0.55] });
    k.box('#4e8540', [0.32, 0.12, 0.5], { at: [0, 1.12, 0.6] });
    for (let i = 0; i < 4; i++) k.cone(C.white, 0.025, 0.07, { at: [-0.1 + i * 0.07, 1.2, 0.84], rot: [180, 0, 0] }, 4);
    for (const sx of [-1, 1]) {
      k.box(C.yellow, [0.03, 0.06, 0.06], { at: [sx * 0.18, 1.45, 0.65] });
      k.box(g, [0.06, 0.18, 0.06], { at: [sx * 0.2, 0.9, 0.42], rot: [40, 0, 0] });
    }
  },
  triceratops(k) {
    dirt(k);
    const o = '#d98a4a';
    k.box(o, [0.6, 0.55, 1.1], { at: [0, 0.65, 0] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(o, [0.18, 0.42, 0.18], { at: [sx * 0.2, 0.21, sz * 0.38] });
    k.box(o, [0.36, 0.34, 0.4], { at: [0, 0.75, 0.7] });
    k.cyl('#b86b35', 0.45, 0.45, 0.08, { at: [0, 0.9, 0.5], rot: [70, 0, 0] }, 9);
    for (const sx of [-1, 1]) k.cone(C.cream, 0.04, 0.35, { at: [sx * 0.12, 1.0, 0.95], rot: [60, 0, 0] }, 5);
    k.cone(C.cream, 0.04, 0.15, { at: [0, 0.78, 0.95], rot: [60, 0, 0] }, 5);
    k.box(o, [0.18, 0.18, 0.5], { at: [0, 0.6, -0.75], rot: [15, 0, 0] });
  },
  styracosaurus(k) {
    dirt(k);
    const o = '#8a7bc4';
    k.box(o, [0.6, 0.55, 1.1], { at: [0, 0.65, 0] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(o, [0.18, 0.42, 0.18], { at: [sx * 0.2, 0.21, sz * 0.38] });
    k.box(o, [0.36, 0.34, 0.4], { at: [0, 0.75, 0.7] });
    k.cyl('#6c5ea8', 0.32, 0.32, 0.08, { at: [0, 0.95, 0.5], rot: [70, 0, 0] }, 9);
    for (let i = 0; i < 6; i++) {
      const a = ((i - 2.5) / 6) * Math.PI * 0.9;
      k.cone(C.cream, 0.04, 0.35, { at: [Math.sin(a) * 0.35, 1.15 + Math.cos(a) * 0.15, 0.38], rot: [-20, 0, (-a * 180) / Math.PI] }, 4);
    }
    k.cone(C.cream, 0.05, 0.4, { at: [0, 0.98, 0.95], rot: [50, 0, 0] }, 5);
    k.box(o, [0.18, 0.18, 0.5], { at: [0, 0.6, -0.75], rot: [15, 0, 0] });
  },
  velociraptor(k) {
    dirt(k);
    const b = '#3fa0b5';
    biped(k, b, '#d7eef2', 0.6);
    k.box(b, [0.2, 0.18, 0.4], { at: [0, 0.8, 0.4] });
    for (let i = 0; i < 4; i++) k.box('#2a6f80', [0.31, 0.06, 0.05], { at: [0, 0.68, -0.15 + i * 0.12], rot: [-12, 0, 0] });
    for (const sx of [-1, 1]) k.box(C.yellow, [0.02, 0.04, 0.04], { at: [sx * 0.1, 0.85, 0.5] });
    k.box('#2a6f80', [0.04, 0.1, 0.25], { at: [0, 0.98, 0.1] });
    // nest of eggs
    k.cyl('#a9845a', 0.35, 0.3, 0.1, { at: [0.6, 0.12, 0.45] }, 10);
    for (const [x, z] of [[0.5, 0.4], [0.7, 0.4], [0.6, 0.57], [0.55, 0.52]]) k.ball('#f5ecd6', 0.1, { at: [x, 0.22, z], scale: [0.8, 1.1, 0.8] });
  },
  argentinosaurus(k) {
    dirt(k, 1.3);
    const g = '#8a9a6b';
    k.ball(g, 0.6, { at: [0, 0.95, 0], scale: [0.9, 0.75, 1.5] }, 1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(g, [0.2, 0.75, 0.2], { at: [sx * 0.3, 0.38, sz * 0.5] });
    k.box(g, [0.18, 0.18, 1.3], { at: [0, 1.35, 1.1], rot: [-30, 0, 0] });
    k.box(g, [0.2, 0.18, 0.3], { at: [0, 1.7, 1.75] });
    k.box(g, [0.16, 0.16, 1.4], { at: [0, 0.8, -1.25], rot: [12, 0, 0] });
    for (const sx of [-1, 1]) k.box(C.black, [0.03, 0.04, 0.04], { at: [sx * 0.1, 1.74, 1.85] });
  },
  giraffatitan(k) {
    dirt(k, 1.2);
    const g = '#b5a27a';
    k.ball(g, 0.55, { at: [0, 1.05, 0], scale: [0.85, 0.75, 1.35] }, 1);
    for (const sx of [-1, 1]) {
      k.box(g, [0.18, 1.0, 0.18], { at: [sx * 0.28, 0.5, 0.45] });
      k.box(g, [0.18, 0.72, 0.18], { at: [sx * 0.28, 0.36, -0.45] });
    }
    k.box(g, [0.16, 1.3, 0.16], { at: [0, 1.9, 0.55], rot: [20, 0, 0] });
    k.box(g, [0.18, 0.16, 0.32], { at: [0, 2.55, 0.85] });
    k.box(g, [0.14, 0.14, 1.1], { at: [0, 0.85, -1.05], rot: [15, 0, 0] });
    for (const sx of [-1, 1]) k.box(C.black, [0.03, 0.04, 0.04], { at: [sx * 0.09, 2.58, 0.95] });
    k.cyl(C.brown, 0.05, 0.07, 1.4, { at: [0.9, 0.7, 1.0] }, 6);
    k.ball(C.darkGreen, 0.35, { at: [0.9, 1.5, 1.0] });
  },
  stegosaurus(k) {
    dirt(k);
    const g = '#7aa35a';
    k.ball(g, 0.5, { at: [0, 0.6, 0], scale: [0.8, 0.8, 1.4] }, 1);
    for (const sx of [-1, 1]) {
      k.box(g, [0.15, 0.35, 0.15], { at: [sx * 0.22, 0.18, 0.4] });
      k.box(g, [0.17, 0.5, 0.17], { at: [sx * 0.22, 0.25, -0.35] });
    }
    k.box(g, [0.18, 0.16, 0.3], { at: [0, 0.4, 0.8] });
    for (let i = 0; i < 7; i++) {
      const z = -0.6 + i * 0.2;
      const h = 0.25 + Math.sin(((i + 1) / 8) * Math.PI) * 0.2;
      k.pyramid('#e2734a', 0.18, h, { at: [0, 0.95 + h / 2 - Math.abs(z) * 0.2, z], scale: [0.25, 1, 1] });
    }
    k.box(g, [0.14, 0.14, 0.7], { at: [0, 0.45, -0.95], rot: [10, 0, 0] });
    for (const sx of [-1, 1]) k.cone(C.cream, 0.03, 0.22, { at: [sx * 0.1, 0.42, -1.2], rot: [0, 0, -sx * 70] }, 4);
  },
  iguanodon(k) {
    dirt(k);
    const g = '#9a8a5a';
    biped(k, g, '#d8cfa8', 0.9);
    k.box(g, [0.26, 0.26, 0.45], { at: [0, 1.2, 0.5] });
    for (const sx of [-1, 1]) {
      k.box(g, [0.08, 0.3, 0.08], { at: [sx * 0.22, 0.9, 0.38], rot: [30, 0, 0] });
      k.cone(C.cream, 0.025, 0.1, { at: [sx * 0.24, 0.8, 0.5], rot: [0, 0, sx * -40] }, 4);
      k.box(C.black, [0.03, 0.04, 0.04], { at: [sx * 0.13, 1.25, 0.68] });
    }
  },
};
