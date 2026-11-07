import * as THREE from 'three';
import { buildModel } from '../models';
import { ROUTES, type Route } from '../data/routes';
import { latLonToVec3, vec3ToLonLat } from './geo';

const DEG = Math.PI / 180;
const VISIBLE: Record<Route['kind'], number> = { plane: 3.4, ship: 2.4, sub: 2.2, train: 2.0, balloon: 1.9 };
const SIZE: Record<Route['kind'], number> = { plane: 0.075, ship: 0.06, sub: 0.055, train: 0.035, balloon: 0.05 };
/** how big things are while you ride them (fraction of normal size) */
const RIDE_SCALE: Record<Route['kind'], number> = { plane: 0.18, ship: 0.15, sub: 0.15, train: 0.1, balloon: 0.15 };

const ss = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export interface Vehicle {
  route: Route;
  parts: THREE.Group[]; // engine first, then train cars
  /** length of one train car in model units (to space the cars) */
  carLen: number;
  pts: THREE.Vector3[];
  cum: number[];
  total: number;
  s: number;
  dir: 1 | -1;
  pause: number;
  size: number;
  pop: number;
  /** current position, forward direction and surface "up" of the engine */
  pos: THREE.Vector3;
  fwd: THREE.Vector3;
  up: THREE.Vector3;
  t: number;
}

/**
 * Planes, ships, trains and balloons travelling along real routes.
 */
export function rideScale(v: Vehicle) {
  return v.size * RIDE_SCALE[v.route.kind];
}

export class VehicleLayer {
  readonly group = new THREE.Group();
  readonly list: Vehicle[] = [];
  timeScale = 1;
  riding: Vehicle | null = null;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private camUp = new THREE.Vector3();
  private m4 = new THREE.Matrix4();

  constructor(private heightAt: (lat: number, lon: number) => number) {
    this.group.name = 'vehicles';
    for (const route of ROUTES) {
      const pts = route.pts.map(([lat, lon]) => latLonToVec3(lat, lon, 1).normalize());
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i - 1].angleTo(pts[i]));
      const parts = [buildModel(route.model)];
      for (let c = 0; c < (route.cars?.count ?? 0); c++) parts.push(buildModel(route.cars!.model));
      for (const p of parts) {
        p.visible = false;
        this.group.add(p);
      }
      const box = new THREE.Box3().setFromObject(parts[parts.length - 1]);
      const carLen = box.max.z - box.min.z;
      this.list.push({
        route,
        parts,
        carLen,
        pts,
        cum,
        total: cum[cum.length - 1],
        s: (this.list.length * 0.37 % 1) * cum[cum.length - 1], // spread them out
        dir: 1,
        pause: 0,
        size: route.size ?? SIZE[route.kind],
        pop: 0,
        pos: new THREE.Vector3(),
        fwd: new THREE.Vector3(),
        up: new THREE.Vector3(),
        t: this.list.length * 3.1,
      });
    }
  }

  /** Point on the route at arc distance s (unit vector), and which segment it's in. */
  private at(v: Vehicle, s: number, out: THREE.Vector3): number {
    const total = v.total;
    if (v.route.loop) s = ((s % total) + total) % total;
    else s = Math.min(total, Math.max(0, s));
    let i = 0;
    while (i < v.cum.length - 2 && v.cum[i + 1] < s) i++;
    const seg = v.cum[i + 1] - v.cum[i] || 1;
    const k = (s - v.cum[i]) / seg;
    // great-circle step between the two waypoints
    const a = v.pts[i];
    const b = v.pts[i + 1];
    const ang = a.angleTo(b);
    if (ang < 1e-6) out.copy(a);
    else {
      const sa = Math.sin((1 - k) * ang) / Math.sin(ang);
      const sb = Math.sin(k * ang) / Math.sin(ang);
      out.copy(a).multiplyScalar(sa).addScaledVector(b, sb);
    }
    return i;
  }

  /** How high above the centre of the Earth a vehicle sits here. */
  private radius(v: Vehicle, s: number, unit: THREE.Vector3, seg: number): number {
    const [lon, lat] = vec3ToLonLat(unit);
    const r = v.route;
    switch (r.kind) {
      case 'plane': {
        const u = s / v.total;
        const climb = ss(0, 0.07, u) * ss(0, 0.07, 1 - u);
        return Math.max(this.heightAt(lat, lon), 1.0) + 0.0012 + 0.032 * climb;
      }
      case 'train':
        return r.tunnels?.includes(seg) ? 0.99 : this.heightAt(lat, lon) + 0.0004;
      case 'balloon':
        return this.heightAt(lat, lon) + 0.012 + Math.sin(v.t * 0.5) * 0.004;
      case 'sub': {
        const c = (v.t % 26) / 26;
        const dive = c > 0.55 && c < 0.9 ? Math.sin(((c - 0.55) / 0.35) * Math.PI) : 0;
        return 1.0 - dive * v.size * 0.45;
      }
      default:
        return 1.0;
    }
  }

  /** Move everything along its route. */
  advance(dt: number) {
    for (const v of this.list) {
      const step = dt * this.timeScale;
      v.t += step;
      if (v.pause > 0) {
        v.pause -= step;
        continue;
      }
      v.s += v.dir * v.route.speed * DEG * step;
      if (!v.route.loop && (v.s > v.total || v.s < 0)) {
        v.s = Math.min(v.total, Math.max(0, v.s));
        v.dir = v.dir === 1 ? -1 : 1; // there and back again
        v.pause = v.route.kind === 'plane' ? 2.5 : 4;
      }
    }
  }

  private place(v: Vehicle, part: THREE.Group, s: number, scale: number, camera: THREE.Camera, lean: number) {
    const unit = this.tmp;
    const seg = this.at(v, s, unit);
    const r = this.radius(v, s, unit, seg);
    const ahead = this.tmp2;
    this.at(v, s + v.dir * 0.002, ahead);
    const pos = unit.clone().multiplyScalar(r);
    const n = unit.clone();
    const fwd = ahead.sub(unit);
    if (fwd.lengthSq() < 1e-12) fwd.set(0, 1, 0);
    // stand up a little towards the top of the screen so it reads like a toy
    const up = n.clone().addScaledVector(this.camUp, lean).normalize();
    fwd.addScaledVector(up, -fwd.dot(up)).normalize();
    const side = new THREE.Vector3().crossVectors(up, fwd).normalize();
    this.m4.makeBasis(side, up, fwd);
    part.quaternion.setFromRotationMatrix(this.m4);
    part.position.copy(pos);
    part.scale.setScalar(scale);
    return { pos, n, fwd };
  }

  /** Position, orient and size everything for this camera. */
  update(camera: THREE.Camera, dist: number, dt: number) {
    this.camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const zoomScale = THREE.MathUtils.clamp((dist - 1) / 0.75, 0.03, 1.3);
    for (const v of this.list) {
      const riding = v === this.riding;
      // is it on our side of the planet and close enough to see?
      this.at(v, v.s, this.tmp);
      const toCam = camera.position.clone().sub(this.tmp);
      const facing = toCam.normalize().dot(this.tmp) > 0.05;
      const want = riding || (facing && dist < VISIBLE[v.route.kind]);
      v.pop += ((want ? 1 : 0) - v.pop) * Math.min(1, dt * 5);
      const show = v.pop > 0.02;
      for (const p of v.parts) p.visible = show;
      // keep the engine's position up to date even when hidden (for tapping & riding)
      const scale = riding ? v.size * RIDE_SCALE[v.route.kind] : (v.size / 2) * zoomScale * Math.min(1, v.pop * 1.1);
      // lean only a little towards the viewer, so the route direction stays clear
      const lean = riding ? 0 : 0.35;
      const head = this.place(v, v.parts[0], v.s, scale, camera, lean);
      v.pos.copy(head.pos);
      v.fwd.copy(head.fwd).multiplyScalar(1);
      v.up.copy(head.n);
      if (v.route.kind === 'plane') {
        // bank gently and tip the nose up/down when climbing or landing
        const u = v.s / v.total;
        const pitch = (ss(0, 0.07, u) < 1 ? -0.25 : 0) + (ss(0, 0.07, 1 - u) < 1 ? 0.25 : 0);
        v.parts[0].rotateX(v.dir > 0 ? pitch : -pitch);
      }
      if (v.route.kind === 'ship' || v.route.kind === 'sub') v.parts[0].rotateZ(Math.sin(v.t * 1.1) * 0.03);
      // train cars follow along behind the engine
      const gap = scale * v.carLen * 1.08;
      for (let c = 1; c < v.parts.length; c++) this.place(v, v.parts[c], v.s - v.dir * gap * c, scale, camera, lean);
    }
  }

  hitTest(x: number, y: number, camera: THREE.Camera, w: number, h: number): Vehicle | null {
    let best: Vehicle | null = null;
    let bestD = Infinity;
    for (const v of this.list) {
      if (!v.parts[0].visible || v.pop < 0.6) continue;
      for (const p of v.parts) {
        const c = p.position.clone().project(camera);
        if (c.z > 1) continue;
        const sx = (c.x * 0.5 + 0.5) * w;
        const sy = (-c.y * 0.5 + 0.5) * h;
        const edge = p.position.clone().add(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(p.scale.x)).project(camera);
        const r = Math.hypot((edge.x - c.x) * 0.5 * w, (edge.y - c.y) * 0.5 * h) + 16;
        const d = Math.hypot(x - sx, y - sy);
        if (d < r && d < bestD) {
          bestD = d;
          best = v;
        }
      }
    }
    return best;
  }
}
