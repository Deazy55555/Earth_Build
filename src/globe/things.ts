import * as THREE from 'three';
import { buildModel } from '../models';
import { PLACES, type Place } from '../data/places';
import { latLonToVec3 } from './geo';

interface Thing {
  place: Place;
  root: THREE.Group; // sits on the surface, oriented to the ground
  body: THREE.Group; // animated
  layers: Record<string, THREE.Object3D>;
  base: THREE.Vector3;
  normal: THREE.Vector3;
  size: number;
  pop: number;
  seed: number;
  launchAt: number;
}

const RANK_DIST = { 1: 2.35, 2: 1.95, 3: 1.6 };

/**
 * Landmarks, animals, boats… placed on the globe. They pop up as you zoom in,
 * stay a comfortable size on screen, and each has a little idle animation.
 */
export class ThingLayer {
  readonly group = new THREE.Group();
  private things: Thing[] = [];
  private time = 0;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private camUp = new THREE.Vector3();
  private up = new THREE.Vector3();
  private fwd = new THREE.Vector3();
  private side = new THREE.Vector3();
  private m4 = new THREE.Matrix4();

  constructor(heightAt: (lat: number, lon: number) => number) {
    this.group.name = 'things';
    const worldUp = new THREE.Vector3(0, 1, 0);
    PLACES.forEach((place, i) => {
      const root = new THREE.Group();
      const r = place.atSea ? 1.0 : heightAt(place.lat, place.lon);
      const base = latLonToVec3(place.lat, place.lon, r);
      const normal = base.clone().normalize();
      // local frame: x = east, y = up, z = south (so models face the viewer when north is up)
      const east = new THREE.Vector3().crossVectors(worldUp, normal);
      if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
      east.normalize();
      const south = new THREE.Vector3().crossVectors(east, normal).normalize();
      root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, normal, south));
      root.rotateY(((place.heading ?? 30) * Math.PI) / 180);
      root.position.copy(base);
      const body = buildModel(place.model ?? place.id);
      root.add(body);
      root.visible = false;
      this.group.add(root);
      this.things.push({
        place,
        root,
        body,
        layers: body.userData.layers ?? {},
        base,
        normal,
        size: (place.size ?? (place.kind === 'boat' ? 0.05 : 0.044)) * 1.6,
        pop: 0,
        seed: i * 1.7,
        launchAt: 20 + ((i * 7.3) % 25),
      });
    });
  }

  update(camera: THREE.Camera, dist: number, dt: number) {
    this.time += dt;
    const t = this.time;
    // keep things a similar size on screen as you zoom
    const zoomScale = THREE.MathUtils.clamp((dist - 1) / 0.75, 0.25, 1.3);
    for (const th of this.things) {
      const want = dist < RANK_DIST[th.place.rank ?? 2];
      // is it on our side of the planet?
      this.tmp.copy(camera.position).sub(th.base);
      const facing = this.tmp.normalize().dot(th.normal) > 0.05;
      const target = want && facing ? 1 : 0;
      th.pop += (target - th.pop) * Math.min(1, dt * (target ? 5 : 8));
      if (th.pop < 0.01 && target === 0) {
        th.root.visible = false;
        continue;
      }
      th.root.visible = true;
      // springy pop-in
      const p = th.pop;
      const springy = p < 1 ? p * (1 + 0.35 * Math.sin(p * Math.PI)) : 1;
      th.root.scale.setScalar((th.size / 2) * zoomScale * springy);
      this.orient(th, camera);
      this.animate(th, t + th.seed, dt);
    }
  }

  /**
   * Stand the model up towards the top of the screen (leaning away from the ground)
   * so you see it from the side like a toy, and turn it to face the camera.
   */
  private orient(th: Thing, camera: THREE.Camera) {
    this.camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const up = this.up.copy(th.normal).addScaledVector(this.camUp, 1.4).normalize();
    const fwd = this.fwd.copy(camera.position).sub(th.base);
    fwd.addScaledVector(up, -fwd.dot(up)).normalize(); // flatten onto the model's ground
    const side = this.side.crossVectors(up, fwd).normalize();
    this.m4.makeBasis(side, up, fwd);
    th.root.quaternion.setFromRotationMatrix(this.m4);
    th.root.rotateY(((th.place.heading ?? 30) * Math.PI) / 180);
  }

  private animate(th: Thing, t: number, dt: number) {
    const b = th.body;
    b.position.set(0, 0, 0);
    b.rotation.set(0, 0, 0);
    switch (th.place.anim) {
      case 'walk':
        b.position.y = Math.abs(Math.sin(t * 3)) * 0.04;
        b.rotation.y = Math.sin(t * 0.4) * 0.35;
        b.rotation.z = Math.sin(t * 3) * 0.02;
        break;
      case 'bob':
        b.position.y = Math.sin(t * 1.6) * 0.03;
        b.rotation.y = Math.sin(t * 0.3) * 0.2;
        break;
      case 'swim': {
        const a = t * 0.25;
        b.position.set(Math.cos(a) * 0.35, Math.sin(t * 1.5) * 0.04 - 0.02, Math.sin(a) * 0.35);
        b.rotation.y = -a;
        break;
      }
      case 'whale': {
        // cruises along the surface, then every so often arches and dives
        const c = (t % 16) / 16;
        let y = -0.12 + Math.sin(t * 0.9) * 0.05;
        let pitch = 0;
        if (c > 0.72 && c < 0.96) {
          const k = (c - 0.72) / 0.24;
          y -= Math.sin(k * Math.PI) * 0.65;
          pitch = Math.cos(k * Math.PI) * 0.3;
        }
        b.position.y = y;
        b.rotation.x = pitch;
        b.position.z = Math.sin(t * 0.2) * 0.3;
        if (th.layers.tail) th.layers.tail.rotation.x = Math.sin(t * 2.5) * 0.35;
        break;
      }
      case 'dive': {
        // submarine: cruises on the surface, dives for a short while, pops back up
        const c = (t % 24) / 24;
        let y = 0;
        if (c > 0.6 && c < 0.7) y = -((c - 0.6) / 0.1);
        else if (c >= 0.7 && c < 0.82) y = -1;
        else if (c >= 0.82 && c < 0.92) y = -1 + (c - 0.82) / 0.1;
        b.position.y = y * 0.85 + Math.sin(t * 1.3) * 0.02;
        b.rotation.x = c > 0.6 && c < 0.7 ? 0.12 : c > 0.82 && c < 0.92 ? -0.12 : 0;
        break;
      }
      case 'sail':
        b.position.y = Math.sin(t * 1.2) * 0.02;
        b.rotation.z = Math.sin(t * 0.9) * 0.04;
        b.rotation.x = Math.sin(t * 0.7) * 0.025;
        if (th.layers.radar) th.layers.radar.rotation.y += dt * 2.5;
        break;
      case 'spin':
        if (th.layers.blades) th.layers.blades.rotation.z -= dt * 1.4;
        if (th.layers.fish) th.layers.fish.rotation.y += dt * 0.8;
        break;
      case 'launch':
        this.animateLaunch(th, dt);
        break;
    }
  }

  private animateLaunch(th: Thing, dt: number) {
    const rocket = th.layers.rocket;
    const flame = th.layers.flame;
    if (!rocket || !flame) return;
    th.launchAt -= dt;
    // countdown → lift-off (5s) → gone for a bit → new rocket rolls out
    const s = -th.launchAt; // seconds since lift-off
    if (s < 0) {
      rocket.position.y = rocket.userData.y0 ??= rocket.position.y;
      flame.position.y = flame.userData.y0 ??= flame.position.y;
      rocket.visible = true;
      flame.visible = s > -1.2; // ignition rumble
      flame.scale.setScalar(s > -1.2 ? 0.6 + Math.random() * 0.3 : 1);
    } else if (s < 5) {
      const rise = 0.25 * s * s;
      rocket.position.y = rocket.userData.y0 + rise;
      flame.position.y = flame.userData.y0 + rise;
      flame.visible = true;
      flame.scale.setScalar(1 + Math.random() * 0.4);
      rocket.visible = flame.visible = rise < 6;
    } else if (s < 9) {
      rocket.visible = flame.visible = false;
    } else {
      th.launchAt = 40 + Math.random() * 25;
      rocket.position.y = rocket.userData.y0;
      flame.position.y = flame.userData.y0;
      rocket.visible = true;
      flame.visible = false;
    }
  }

  /** Start a launch now (when a rocket site is tapped). */
  launch(id: string) {
    const th = this.things.find((x) => x.place.id === id);
    if (th && th.launchAt > 1.5) th.launchAt = 1.5;
  }

  /** Which thing (if any) is under this screen point? */
  hitTest(x: number, y: number, camera: THREE.Camera, w: number, h: number): Place | null {
    let best: Place | null = null;
    let bestD = Infinity;
    const right = this.tmp2.set(1, 0, 0).applyQuaternion(camera.quaternion);
    for (const th of this.things) {
      if (!th.root.visible || th.pop < 0.6) continue;
      const scale = th.root.scale.x;
      const c = this.tmp.copy(th.normal).multiplyScalar(scale * 0.8).add(th.base);
      const edge = c.clone().addScaledVector(right, scale * 1.0);
      c.project(camera);
      edge.project(camera);
      if (c.z > 1) continue;
      const sx = (c.x * 0.5 + 0.5) * w;
      const sy = (-c.y * 0.5 + 0.5) * h;
      const r = Math.hypot((edge.x - c.x) * 0.5 * w, (edge.y - c.y) * 0.5 * h) + 14;
      const d = Math.hypot(x - sx, y - sy);
      if (d < r && d < bestD) {
        bestD = d;
        best = th.place;
      }
    }
    return best;
  }
}
