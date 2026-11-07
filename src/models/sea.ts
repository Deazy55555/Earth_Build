import { Kit, C } from './kit';

type Build = (k: Kit) => void;

/** Sea creatures. y = 0 is the water surface; anything below is hidden by the ocean. */
export const SEA: Record<string, Build> = {
  bluewhale(k) {
    const b = '#6f8fb8';
    k.ball(b, 0.5, { at: [0, 0.05, 0], scale: [0.7, 0.5, 2.2] }, 1);
    k.box('#a9bfd9', [0.5, 0.05, 1.5], { at: [0, -0.15, 0.2] });
    k.box(b, [0.1, 0.12, 0.15], { at: [0, 0.27, -0.45] });
    k.layer('tail', [0, 0.05, -1.1]);
    k.box(b, [0.2, 0.15, 0.5], { at: [0, 0.05, -1.3] });
    k.box(b, [0.9, 0.05, 0.25], { at: [0, 0.1, -1.6] });
    k.body();
    for (const sx of [-1, 1]) k.box(C.black, [0.03, 0.05, 0.05], { at: [sx * 0.3, 0.1, 0.8] });
  },
  humpback(k) {
    const b = '#3e4a5e';
    k.ball(b, 0.5, { at: [0, 0.02, 0], scale: [0.75, 0.55, 1.8] }, 1);
    for (const sx of [-1, 1]) k.box(C.white, [0.8, 0.05, 0.2], { at: [sx * 0.6, -0.05, 0.3], rot: [0, sx * -20, sx * -15] });
    k.layer('tail', [0, 0.05, -0.9]);
    k.box(b, [0.18, 0.15, 0.4], { at: [0, 0.1, -1.05], rot: [-25, 0, 0] });
    k.box(b, [0.9, 0.05, 0.25], { at: [0, 0.28, -1.25], rot: [-25, 0, 0] });
    k.box(C.white, [0.86, 0.02, 0.2], { at: [0, 0.25, -1.25], rot: [-25, 0, 0] });
  },
  orca(k) {
    k.ball(C.black, 0.5, { at: [0, 0.05, 0], scale: [0.6, 0.55, 1.4] }, 1);
    k.box(C.white, [0.4, 0.05, 0.8], { at: [0, -0.1, 0.2] });
    for (const sx of [-1, 1]) k.box(C.white, [0.04, 0.1, 0.18], { at: [sx * 0.28, 0.2, 0.35] });
    k.extrude(C.black, [[-0.15, 0], [0.15, 0], [-0.05, 0.6]], 0.06, { at: [0, 0.28, -0.05], rot: [0, 90, 0] });
    k.layer('tail', [0, 0.05, -0.7]);
    k.box(C.black, [0.6, 0.05, 0.2], { at: [0, 0.08, -0.85] });
  },
  shark(k) {
    const g = '#8796a8';
    k.ball(g, 0.4, { at: [0, -0.05, 0], scale: [0.6, 0.55, 1.8] }, 1);
    k.extrude(g, [[-0.25, 0], [0.25, 0], [-0.15, 0.6]], 0.05, { at: [0, 0.12, 0], rot: [0, 90, 0] });
    k.layer('tail', [0, 0, -0.65]);
    k.extrude(g, [[0, 0], [-0.3, 0.45], [-0.2, -0.3]], 0.05, { at: [0, -0.05, -0.72], rot: [0, 90, 0] });
  },
  seaturtle(k) {
    k.box('#5ec8d8', [1.8, 0.02, 1.8], { at: [0, -0.02, 0] });
    k.ball('#4d8a4a', 0.5, { at: [0, 0.02, 0], scale: [1, 0.35, 1.2] }, 1);
    k.ball('#6aa35f', 0.3, { at: [0, 0.12, 0], scale: [1, 0.3, 1.2] }, 1);
    k.ball('#b5c98a', 0.15, { at: [0, 0.05, 0.62] });
    for (const sx of [-1, 1]) {
      k.box('#b5c98a', [0.5, 0.04, 0.16], { at: [sx * 0.55, 0.0, 0.3], rot: [0, sx * -30, 0] });
      k.box('#b5c98a', [0.25, 0.04, 0.12], { at: [sx * 0.35, 0.0, -0.5], rot: [0, sx * 30, 0] });
    }
  },
  octopus(k) {
    const o = '#e8613c';
    k.ball(o, 0.35, { at: [0, 0.35, 0], scale: [1, 1.2, 1] }, 1);
    for (const sx of [-1, 1]) {
      k.ball(C.white, 0.08, { at: [sx * 0.13, 0.3, 0.3] });
      k.ball(C.black, 0.04, { at: [sx * 0.13, 0.3, 0.37] });
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.box(o, [0.08, 0.06, 0.5], { at: [Math.sin(a) * 0.4, 0.04, Math.cos(a) * 0.4], rot: [0, (a * 180) / Math.PI, 0] });
      k.ball(o, 0.06, { at: [Math.sin(a) * 0.66, 0.06, Math.cos(a) * 0.66] });
    }
  },
  dolphins(k) {
    const g = '#8aa6c4';
    for (const [x, z, h] of [[-0.35, 0, 0.35], [0.4, -0.3, 0.2]] as const) {
      k.ball(g, 0.3, { at: [x, h, z], scale: [0.6, 0.6, 1.6], rot: [-25, 0, 0] }, 1);
      k.cone(g, 0.07, 0.3, { at: [x, h + 0.15, z + 0.5], rot: [70, 0, 0] }, 5);
      k.extrude(g, [[-0.12, 0], [0.12, 0], [-0.08, 0.25]], 0.04, { at: [x, h + 0.15, z - 0.05], rot: [0, 90, 0] });
      k.box(g, [0.4, 0.04, 0.14], { at: [x, h - 0.18, z - 0.48], rot: [-25, 0, 0] });
    }
  },
  narwhal(k) {
    const g = '#a8adb6';
    k.ball(g, 0.4, { at: [0, 0.0, 0], scale: [0.7, 0.55, 1.5] }, 1);
    for (let i = 0; i < 6; i++) k.box('#6f7680', [0.08, 0.02, 0.08], { at: [((i * 0.37) % 1 - 0.5) * 0.4, 0.2, ((i * 0.61) % 1 - 0.5) * 0.9] });
    k.cyl('#f1ead8', 0.005, 0.035, 0.9, { at: [0, 0.12, 1.0], rot: [80, 0, 0] }, 5);
    k.layer('tail', [0, 0, -0.55]);
    k.box(g, [0.55, 0.05, 0.2], { at: [0, 0.03, -0.68] });
  },
  mantaray(k) {
    k.box('#5ec8d8', [1.8, 0.02, 1.8], { at: [0, -0.02, 0] });
    k.extrude('#2f3a52', [[0, 0.5], [0.9, -0.05], [0, -0.35], [-0.9, -0.05]], 0.08, { at: [0, 0.06, 0], rot: [90, 0, 0] });
    k.box(C.white, [0.5, 0.02, 0.3], { at: [0, 0.01, 0] });
    for (const sx of [-1, 1]) k.box('#2f3a52', [0.06, 0.06, 0.18], { at: [sx * 0.14, 0.1, 0.55] });
    k.box('#2f3a52', [0.03, 0.03, 0.6], { at: [0, 0.06, -0.6] });
  },
  reef(k) {
    k.box('#5ec8d8', [2.0, 0.02, 2.0], { at: [0, -0.02, 0] });
    k.cyl('#f2d7a0', 0.95, 1.0, 0.06, { at: [0, 0.01, 0] }, 12);
    const coral = ['#ff6f91', '#ff9a3c', '#c86bff', '#ffd23f', '#4fd1a5'];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      const r = 0.25 + (i % 3) * 0.22;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (i % 3 === 0) k.ball(coral[i % 5], 0.16, { at: [x, 0.12, z] });
      else for (let j = 0; j < 3; j++) k.cyl(coral[i % 5], 0.03, 0.04, 0.3 + j * 0.06, { at: [x + (j - 1) * 0.06, 0.18, z], rot: [0, 0, (j - 1) * 20] }, 5);
    }
    k.layer('fish', [0, 0, 0]);
    for (const [x, z] of [[0.35, 0.3], [-0.4, -0.1]]) {
      k.box(C.orange, [0.08, 0.14, 0.22], { at: [x, 0.42, z] });
      k.box(C.white, [0.085, 0.14, 0.03], { at: [x, 0.42, z + 0.03] });
      k.box(C.orange, [0.02, 0.1, 0.06], { at: [x, 0.42, z - 0.13] });
    }
  },
};
