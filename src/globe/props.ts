import * as THREE from 'three';
import { Kit, C, TOY_MATERIAL } from '../models/kit';
import { latLonToVec3 } from './geo';
import { sampleGrid, type Terrain } from './mapTextures';
import { aridity, type Nature } from './nature';
import { PLACES } from '../data/places';

// ------------------------------------------------------------- little props

type PropId = 'pine' | 'tree' | 'jungle' | 'acacia' | 'palm' | 'cactus' | 'rock' | 'bush' | 'snowpine';

const BUILD: Record<PropId, (k: Kit) => void> = {
  pine(k) {
    k.cyl(C.darkBrown, 0.05, 0.07, 0.3, { at: [0, 0.15, 0] }, 5);
    k.cone('#2f7d4f', 0.32, 0.5, { at: [0, 0.45, 0] }, 7);
    k.cone('#38915a', 0.25, 0.42, { at: [0, 0.72, 0] }, 7);
    k.cone('#42a364', 0.16, 0.34, { at: [0, 0.97, 0] }, 7);
  },
  snowpine(k) {
    k.cyl(C.darkBrown, 0.05, 0.07, 0.3, { at: [0, 0.15, 0] }, 5);
    k.cone('#2f6f50', 0.32, 0.5, { at: [0, 0.45, 0] }, 7);
    k.cone('#f2f7fb', 0.22, 0.28, { at: [0, 0.65, 0] }, 7);
    k.cone('#2f6f50', 0.2, 0.36, { at: [0, 0.82, 0] }, 7);
    k.cone('#f2f7fb', 0.1, 0.16, { at: [0, 1.0, 0] }, 7);
  },
  tree(k) {
    k.cyl(C.brown, 0.05, 0.07, 0.42, { at: [0, 0.21, 0] }, 5);
    k.ball('#5cbf5a', 0.3, { at: [0, 0.62, 0] }, 1);
    k.ball('#6fcf63', 0.2, { at: [0.14, 0.78, 0.05] }, 1);
  },
  jungle(k) {
    k.cyl(C.brown, 0.06, 0.08, 0.55, { at: [0, 0.27, 0] }, 5);
    k.ball('#2e8c45', 0.34, { at: [0, 0.75, 0], scale: [1.15, 0.75, 1.15] }, 1);
    k.ball('#37a04f', 0.24, { at: [0.2, 0.62, 0.1], scale: [1, 0.7, 1] }, 1);
    k.ball('#28803f', 0.22, { at: [-0.18, 0.66, -0.08], scale: [1, 0.7, 1] }, 1);
  },
  acacia(k) {
    k.cyl('#7a5536', 0.04, 0.06, 0.55, { at: [0, 0.27, 0], rot: [0, 0, 8] }, 5);
    k.cyl('#7fa83f', 0.42, 0.36, 0.12, { at: [0.05, 0.6, 0] }, 9);
    k.cyl('#8fb84a', 0.3, 0.32, 0.07, { at: [0.05, 0.69, 0] }, 9);
  },
  palm(k) {
    k.cyl('#a07a4f', 0.035, 0.06, 0.8, { at: [0.05, 0.4, 0], rot: [0, 0, -8] }, 5);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 360;
      k.box('#3fae5a', [0.45, 0.03, 0.12], { at: [0.1 + Math.cos((a * Math.PI) / 180) * 0.18, 0.8, Math.sin((a * Math.PI) / 180) * 0.18], rot: [0, -a, -25] });
    }
  },
  cactus(k) {
    k.cyl('#4fa35a', 0.08, 0.09, 0.7, { at: [0, 0.35, 0] }, 7);
    k.cyl('#4fa35a', 0.05, 0.05, 0.2, { at: [0.14, 0.4, 0], rot: [0, 0, 90] }, 6);
    k.cyl('#4fa35a', 0.05, 0.05, 0.22, { at: [0.22, 0.52, 0] }, 6);
    k.cyl('#4fa35a', 0.045, 0.045, 0.16, { at: [-0.12, 0.3, 0], rot: [0, 0, 90] }, 6);
    k.cyl('#4fa35a', 0.045, 0.045, 0.18, { at: [-0.19, 0.4, 0] }, 6);
  },
  rock(k) {
    k.ball('#9c958c', 0.3, { at: [0, 0.14, 0], scale: [1.1, 0.7, 0.9] }, 0);
    k.ball('#b0a99f', 0.18, { at: [0.25, 0.08, 0.1], scale: [1, 0.7, 1] }, 0);
  },
  bush(k) {
    k.ball('#5aa84f', 0.2, { at: [0, 0.14, 0], scale: [1.2, 0.8, 1.1] }, 1);
    k.ball('#69b85a', 0.14, { at: [0.18, 0.1, 0.05] }, 1);
  },
};

const IDS = Object.keys(BUILD) as PropId[];

function buildGeometry(id: PropId): THREE.BufferGeometry {
  const k = new Kit();
  BUILD[id](k);
  const g = k.build();
  const mesh = g.children[0] as THREE.Mesh;
  const geo = mesh.geometry as THREE.BufferGeometry;
  geo.computeBoundingBox();
  const hgt = geo.boundingBox!.max.y || 1;
  geo.scale(1 / hgt, 1 / hgt, 1 / hgt); // 1 unit tall
  return geo;
}

// ------------------------------------------------------------- biomes

function hash3(a: number, b: number, c: number) {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

const ss = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** The world's big rainforests (roughly): Amazon, Central America, West & Central Africa, South-East Asia. */
function isRainforest(lat: number, lon: number) {
  if (lon > -82 && lon < -44 && lat > -14 && lat < 8) return true;
  if (lon > -92 && lon < -76 && lat > 6 && lat < 18) return true;
  if (lon > -14 && lon < 30 && lat > -6 && lat < 8) return true;
  if (lon > 92 && lon < 156 && lat > -10 && lat < 14) return true;
  return false;
}

/** What grows here (or null for nothing)? `r` is a random number 0..1. */
function biome(lat: number, lon: number, e: number, desert: number, tundra: number, r: number): PropId | null {
  const al = Math.abs(lat);
  const snowLine = 0.9 - 0.55 * ss(34, 47, al) - 0.17 * ss(47, 66, al);
  if (lat < -60 || e > snowLine) return null; // ice and snow
  if (lat > 60 && e > 0.22 && lon > -75 && lon < -10) return null; // Greenland ice sheet
  if (desert > 0.35 || aridity(lat, lon) > 0.6) {
    if (r > 0.35) return null; // deserts are mostly empty
    if (lon < -30) return r < 0.18 ? "cactus" : r < 0.3 ? "bush" : "rock";
    return r < 0.05 ? 'palm' : 'rock';
  }
  if (e > 0.42) return r < 0.5 ? (al > 30 ? 'snowpine' : 'rock') : r < 0.75 ? 'rock' : null;
  if (tundra > 0.4 || al > 66) return r < 0.25 ? 'rock' : r < 0.4 ? 'bush' : null;
  if (al < 14 && isRainforest(lat, lon)) return r < 0.6 ? 'jungle' : r < 0.72 ? 'palm' : null;
  if (al < 28) return r < 0.22 ? 'acacia' : r < 0.36 ? 'bush' : r < 0.4 ? 'rock' : null;
  if (al < 50) return r < 0.4 ? 'tree' : r < 0.52 ? 'pine' : r < 0.58 ? 'bush' : null;
  return r < 0.55 ? 'pine' : r < 0.58 ? 'rock' : null;
}

// ------------------------------------------------------------- layer

interface Inst {
  type: PropId;
  pos: THREE.Vector3;
  normal: THREE.Vector3;
  size: number;
  spin: number;
  born: number;
}

const LEVELS = [
  { maxDist: 1.1, spacing: 0.16 }, // riding along
  { maxDist: 1.28, spacing: 0.55 },
  { maxDist: 1.5, spacing: 0.9 },
  { maxDist: 1.75, spacing: 1.4 },
];
const REACH = 9; // how many cells out from the centre of the view
const MAX_PER_TYPE = 700;

/**
 * Trees, rocks, bushes and cactus scattered over the land near where you're looking,
 * in little clumps, chosen by climate (jungle, savanna, forest, desert, tundra, mountains).
 */
export class PropLayer {
  readonly group = new THREE.Group();
  private meshes = new Map<PropId, THREE.InstancedMesh>();
  private insts: Inst[] = [];
  private center = new THREE.Vector3(0, 0, 0);
  private level = -1;
  private time = 0;
  private dirty = true;
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private up = new THREE.Vector3();
  private fwd = new THREE.Vector3();
  private side = new THREE.Vector3();
  private camUp = new THREE.Vector3();
  private lastCam = new THREE.Matrix4();
  private keepOut: { n: THREE.Vector3; r: number }[];

  constructor(
    private terrain: Terrain,
    private nature: () => Nature | null,
    private heightAt: (lat: number, lon: number) => number,
  ) {
    this.group.name = 'props';
    for (const id of IDS) {
      const mesh = new THREE.InstancedMesh(buildGeometry(id), TOY_MATERIAL, MAX_PER_TYPE);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.meshes.set(id, mesh);
      this.group.add(mesh);
    }
    // keep a clear patch around every landmark and animal
    this.keepOut = PLACES.filter((p) => !p.atSea).map((p) => ({ n: latLonToVec3(p.lat, p.lon, 1).normalize(), r: 0.012 }));
  }

  private rebuild(lat: number, lon: number, level: number) {
    const nat = this.nature();
    const t = this.terrain;
    const spacing = LEVELS[level].spacing;
    const radius = spacing * REACH;
    const old = new Map(this.insts.map((i) => [`${i.pos.x.toFixed(5)},${i.pos.z.toFixed(5)}`, i.born]));
    this.insts = [];
    const counts = new Map<PropId, number>();
    const lat0 = Math.max(-89, lat - radius);
    const lat1 = Math.min(89, lat + radius);
    const n = new THREE.Vector3();
    for (let gy = Math.floor(lat0 / spacing); gy <= Math.ceil(lat1 / spacing); gy++) {
      const clat = gy * spacing;
      const lonStep = spacing / Math.max(0.2, Math.cos((clat * Math.PI) / 180));
      const lonRad = radius / Math.max(0.2, Math.cos((clat * Math.PI) / 180));
      for (let gx = Math.floor((lon - lonRad) / lonStep); gx <= Math.ceil((lon + lonRad) / lonStep); gx++) {
        // fewer props towards the edge so there's no hard line where they stop
        const edge = Math.hypot(clat - lat, (gx * lonStep - lon) * Math.cos((clat * Math.PI) / 180)) / radius;
        if (edge > 1 || hash3(gx, gy, 3.3) < ss(0.6, 1, edge)) continue;
        // a little clump of 1–3 props per cell
        for (let c = 0; c < 3; c++) {
          const r1 = hash3(gx, gy, c * 3 + level * 17);
          const r2 = hash3(gy, gx, c * 3 + 1 + level * 17);
          const r3 = hash3(gx + 0.5, gy - 0.5, c * 3 + 2);
          const jungle = Math.abs(clat) < 14 && isRainforest(clat, gx * lonStep);
          if (c > 0 && r3 > (jungle ? 0.9 : 0.45)) continue;
          const plat = clat + (r1 - 0.5) * spacing * (c ? 0.5 : 0.9);
          let plon = gx * lonStep + (r2 - 0.5) * lonStep * (c ? 0.5 : 0.9);
          plon = ((plon + 540) % 360) - 180;
          if (!sampleGrid(t, t.land, plat, plon)) continue;
          const e = sampleGrid(t, t.elev, plat, plon);
          const des = nat ? sampleGrid(t, nat.desert, plat, plon) : 0;
          const tun = nat ? sampleGrid(t, nat.tundra, plat, plon) : 0;
          const type = biome(plat, plon, e, des, tun, hash3(gx, gy, 99 + c));
          if (!type) continue;
          if ((counts.get(type) ?? 0) >= MAX_PER_TYPE) continue;
          latLonToVec3(plat, plon, 1, n);
          if (this.keepOut.some((k) => k.n.distanceTo(n) < k.r * (level + 0.4))) continue;
          const pos = latLonToVec3(plat, plon, this.heightAt(plat, plon) - 0.0005);
          const key = `${pos.x.toFixed(5)},${pos.z.toFixed(5)}`;
          counts.set(type, (counts.get(type) ?? 0) + 1);
          this.insts.push({
            type,
            pos,
            normal: pos.clone().normalize(),
            size: (0.65 + hash3(gy, gx, 7 + c) * 0.6) * (type === 'rock' ? 0.45 : type === 'bush' ? 0.55 : 1),
            spin: hash3(gx, gy, 11 + c) * Math.PI * 2,
            born: old.get(key) ?? this.time + hash3(gx, gy, 5) * 0.4,
          });
        }
      }
    }
    this.center.copy(latLonToVec3(lat, lon, 1));
    this.level = level;
    this.dirty = true;
  }

  update(camera: THREE.Camera, viewLat: number, viewLon: number, dist: number, dt: number) {
    this.time += dt;
    const level = LEVELS.findIndex((l) => dist < l.maxDist);
    this.group.visible = level >= 0;
    if (level < 0) {
      if (this.insts.length) {
        this.insts = [];
        for (const m of this.meshes.values()) m.count = 0;
        this.level = -1;
      }
      return;
    }
    const here = latLonToVec3(viewLat, viewLon, 1);
    const moved = here.distanceTo(this.center) > ((LEVELS[level].spacing * REACH * Math.PI) / 180) * 0.3;
    if (level !== this.level || moved) this.rebuild(viewLat, viewLon, level);

    // same size rule as the big models, but smaller
    const zoomScale = THREE.MathUtils.clamp((dist - 1) / 0.75, 0.08, 1.3);
    const base = 0.024 * zoomScale;
    const growing = this.insts.some((i) => this.time - i.born < 0.6);
    if (!this.dirty && !growing && camera.matrixWorld.equals(this.lastCam)) return;
    this.lastCam.copy(camera.matrixWorld);
    this.dirty = false;

    this.camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const counts = new Map<PropId, number>();
    const toCam = this.fwd;
    for (const inst of this.insts) {
      toCam.copy(camera.position).sub(inst.pos);
      if (toCam.dot(inst.normal) < 0) continue; // far side
      const age = Math.min(1, Math.max(0, (this.time - inst.born) / 0.6));
      const pop = age < 1 ? age * (1 + 0.4 * Math.sin(age * Math.PI)) : 1;
      if (pop <= 0) continue;
      // stand up towards the top of the screen like the big models
      this.up.copy(inst.normal).addScaledVector(this.camUp, 1.1).normalize();
      this.fwd.copy(camera.position).sub(inst.pos);
      this.fwd.addScaledVector(this.up, -this.fwd.dot(this.up)).normalize();
      this.side.crossVectors(this.up, this.fwd).normalize();
      this.m4.makeBasis(this.side, this.up, this.fwd);
      this.q.setFromRotationMatrix(this.m4);
      this.q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), inst.spin));
      const sc = base * inst.size * pop;
      this.s.set(sc, sc, sc);
      this.m4.compose(inst.pos, this.q, this.s);
      const mesh = this.meshes.get(inst.type)!;
      const n = counts.get(inst.type) ?? 0;
      mesh.setMatrixAt(n, this.m4);
      counts.set(inst.type, n + 1);
    }
    for (const [id, mesh] of this.meshes) {
      mesh.count = counts.get(id) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
