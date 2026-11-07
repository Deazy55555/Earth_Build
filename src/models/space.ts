import { Kit, C } from './kit';

type Build = (k: Kit) => void;

interface RocketStyle {
  body: string;
  band: string;
  nose: string;
  boosters?: number;
  boosterColor?: string;
  height?: number;
}

/** Launch pad with a rocket on the 'rocket' layer and a flame on the 'flame' layer (both lift off together). */
function launchSite(k: Kit, s: RocketStyle) {
  const h = s.height ?? 1.6;
  k.box('#c9c4ba', [1.6, 0.12, 1.6], { at: [0, 0.06, 0] });
  k.box('#8f8a80', [0.6, 0.2, 0.6], { at: [0, 0.22, 0] });
  // service tower
  for (let y = 0.4; y < h + 0.3; y += 0.25) k.box(C.red, [0.3, 0.04, 0.3], { at: [-0.55, y, 0] });
  for (const [x, z] of [[-0.68, -0.12], [-0.42, -0.12], [-0.68, 0.12], [-0.42, 0.12]]) k.box(C.red, [0.04, h + 0.25, 0.04], { at: [x, (h + 0.25) / 2 + 0.3, z] });
  k.box(C.red, [0.25, 0.04, 0.06], { at: [-0.3, h * 0.75 + 0.3, 0] });
  k.box('#3d8bff', [0.5, 0.05, 0.8], { at: [0.6, 0.13, 0.4] });

  k.layer('rocket', [0, 0.32, 0]);
  k.cyl(s.body, 0.13, 0.13, h, { at: [0, 0.32 + h / 2, 0] }, 12);
  k.cyl(s.band, 0.135, 0.135, 0.08, { at: [0, 0.32 + h * 0.3, 0] }, 12);
  k.cyl(s.band, 0.135, 0.135, 0.08, { at: [0, 0.32 + h * 0.7, 0] }, 12);
  k.cone(s.nose, 0.13, 0.35, { at: [0, 0.32 + h + 0.17, 0] }, 12);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    k.box(s.band, [0.02, 0.22, 0.14], { at: [Math.cos(a) * 0.15, 0.45, Math.sin(a) * 0.15], rot: [0, (-a * 180) / Math.PI, 0] });
  }
  for (let i = 0; i < (s.boosters ?? 0); i++) {
    const a = (i / (s.boosters ?? 1)) * Math.PI * 2 + Math.PI / 4;
    const bh = h * 0.55;
    k.cyl(s.boosterColor ?? s.body, 0.07, 0.08, bh, { at: [Math.cos(a) * 0.2, 0.32 + bh / 2, Math.sin(a) * 0.2] }, 8);
    k.cone(s.boosterColor ?? s.body, 0.07, 0.18, { at: [Math.cos(a) * 0.2, 0.32 + bh + 0.09, Math.sin(a) * 0.2] }, 8);
  }
  k.layer('flame', [0, 0.32, 0]);
  k.cone(C.orange, 0.12, 0.5, { at: [0, 0.07, 0], rot: [180, 0, 0] }, 8);
  k.cone(C.yellow, 0.07, 0.3, { at: [0, 0.12, 0], rot: [180, 0, 0] }, 8);
  k.body();
}

export const SPACE: Record<string, Build> = {
  kennedy(k) {
    launchSite(k, { body: C.white, band: C.black, nose: C.white, boosters: 2, boosterColor: '#f2f2f2', height: 1.7 });
    k.box('#d8d4cc', [0.5, 0.7, 0.4], { at: [0.9, 0.45, -0.6] });
    k.box('#3d8bff', [0.3, 0.2, 0.02], { at: [0.9, 0.55, -0.39] });
  },
  baikonur(k) {
    launchSite(k, { body: '#dfe3e6', band: '#4e5d4a', nose: '#dfe3e6', boosters: 4, boosterColor: '#dfe3e6', height: 1.5 });
  },
  kourou(k) {
    k.cone(C.darkGreen, 0.4, 0.6, { at: [1.0, 0.3, -0.7] }, 6);
    launchSite(k, { body: C.white, band: '#3d8bff', nose: C.white, boosters: 2, boosterColor: '#e9e9e9', height: 1.6 });
  },
  tanegashima(k) {
    launchSite(k, { body: C.white, band: C.red, nose: C.white, boosters: 2, boosterColor: '#f4f4f4', height: 1.55 });
  },
  maunakea(k) {
    k.cone('#7a5a48', 1.5, 0.9, { at: [0, 0.45, 0] }, 10);
    for (const [x, z, r] of [[0, 0, 0.25], [0.45, 0.25, 0.18], [-0.4, 0.3, 0.2], [0.15, -0.4, 0.17]]) {
      const y = 0.9 - Math.hypot(x, z) * 0.6;
      k.cyl(C.white, r, r, 0.2, { at: [x, y + 0.08, z] }, 12);
      k.dome(C.white, r, { at: [x, y + 0.18, z] });
      k.box(C.darkGrey, [r * 0.35, r * 0.9, 0.02], { at: [x, y + 0.28, z + r * 0.85], rot: [-30, 0, 0] });
    }
  },
  alma(k) {
    k.cyl('#d9b98f', 1.4, 1.5, 0.08, { at: [0, 0.04, 0] }, 12);
    for (const [x, z] of [[-0.6, 0.3], [0, 0], [0.6, 0.35], [-0.2, -0.6], [0.55, -0.45], [-0.8, -0.4]]) {
      k.box(C.white, [0.12, 0.35, 0.12], { at: [x, 0.25, z] });
      k.dome(C.white, 0.28, { at: [x, 0.62, z + 0.05], rot: [-120, 0, 0], scale: [1, 0.45, 1] });
    }
  },
  parkes(k) {
    k.cyl(C.leaf, 1.2, 1.25, 0.08, { at: [0, 0.04, 0] }, 12);
    k.cyl(C.white, 0.3, 0.38, 0.6, { at: [0, 0.38, 0] }, 10);
    k.dome('#f2f2f2', 0.85, { at: [0, 1.15, 0.05], rot: [-140, 0, 0], scale: [1, 0.35, 1] }, 16);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      k.box(C.grey, [0.03, 0.6, 0.03], { at: [Math.cos(a) * 0.3, 1.25, 0.25 + Math.sin(a) * 0.3], rot: [40, 0, 0] });
    }
    k.ball(C.grey, 0.08, { at: [0, 1.45, 0.5] });
  },
};
