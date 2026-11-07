import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadCountries, countryAt, type Country } from '../data/countries';
import { buildColorTexture, buildIdTexture, buildMaskTexture, buildTerrain, sampleGrid, type Terrain } from './mapTextures';
import { createLand, createAtmosphere, LAND_HEIGHT, LAND_LIFT, type Land } from './earth';
import { createOcean } from './ocean';
import { createClouds, createStars } from './sky';
import { latLonToVec3, vec3ToLonLat } from './geo';
import { LabelLayer, type LabelSpec } from './labels';
import { DetailPatch } from './detail';
import { ThingLayer } from './things';
import { PropLayer } from './props';
import { VehicleLayer, rideScale, type Vehicle } from './vehicles';
import type { Place } from '../data/places';
import { buildOceanGrid, waterAt } from '../data/oceans';
import { factsFor } from '../data/cards';
import { CONTINENTS, WATERS, WATER_LABELS } from '../data/kid';

const MIN_DIST = 1.18;
const MAX_DIST = 4.2;
const HOME_DIST = 3.55;
const LIGHT_OFFSET = new THREE.Vector3(-0.55, 0.65, 1).normalize();

interface Flight {
  from: THREE.Vector3;
  to: THREE.Vector3;
  fromDist: number;
  toDist: number;
  t: number;
  duration: number;
}

export interface GlobeEvents {
  onCountryTap?: (c: Country) => void;
  onLabelTap?: (label: LabelSpec) => void;
  onWaterTap?: (id: string) => void;
  onThingTap?: (place: Place) => void;
  onVehicleTap?: (v: Vehicle) => void;
  onRideEnd?: () => void;
  onEmptyTap?: () => void;
}

const EXTRA_LABEL_SPOTS: Record<string, [number, number][]> = {
  Russia: [[60, 48]],
  Canada: [[54, -72]],
};

/** Below this distance the camera starts tipping towards the horizon. */
const TILT_START = 1.9;
const TILT_MAX = THREE.MathUtils.degToRad(32);

export class GlobeApp {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private timer = new THREE.Timer();
  private sun = new THREE.DirectionalLight("#fff4e0", 2.1);
  private land!: Land;
  private ocean!: ReturnType<typeof createOcean>;
  private clouds!: THREE.Group;
  private stars!: THREE.Points;
  private flight: Flight | null = null;
  private zoomGoal: number | null = null;
  private lastInteraction = performance.now();
  private pickSphere = new THREE.Sphere(new THREE.Vector3(), 1 + LAND_LIFT + LAND_HEIGHT * 0.5);
  private raycaster = new THREE.Raycaster();
  private frameTimes: number[] = [];
  private qualityChecked = 0;
  private pixelRatio: number;
  readonly labels: LabelLayer;
  private detail!: DetailPatch;
  things!: ThingLayer;
  private props!: PropLayer;
  vehicles!: VehicleLayer;
  private rideCam = new THREE.Vector3();
  private rideLook = new THREE.Vector3();
  /** where the camera would be without tilt — what the orbit controls work with */
  private orbitPos = new THREE.Vector3();
  private orbitQuat = new THREE.Quaternion();
  private width = 1;
  private height = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    labelRoot: HTMLElement,
    private events: GlobeEvents = {},
  ) {
    this.labels = new LabelLayer(labelRoot);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
    this.camera.position.copy(latLonToVec3(20, 10, HOME_DIST));
    this.orbitPos.copy(this.camera.position);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = MIN_DIST;
    this.controls.maxDistance = MAX_DIST;
    this.controls.zoomSpeed = 0.9;
    this.controls.autoRotateSpeed = 0.35;
    this.controls.addEventListener('start', () => this.touched());

    this.scene.add(new THREE.HemisphereLight("#eaf5ff", "#9a8cc4", 1.7));
    this.scene.add(this.sun);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.setupTapping();
  }

  /** Builds textures and meshes. Heavy-ish, so call after the loading screen has painted. */
  terrain!: Terrain;
  heightAt: (lat: number, lon: number) => number = () => 1;

  build(topo: ImageData | null) {
    const list = loadCountries();
    const color = buildColorTexture(list);
    const ids = buildIdTexture(list);
    const mask = buildMaskTexture(list);
    const { terrain, texture: heightTex } = buildTerrain(mask, topo);
    this.terrain = terrain;
    color.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.ocean = createOcean(mask);
    this.detail = new DetailPatch(list, this.renderer.capabilities.getMaxAnisotropy(), terrain);
    this.land = createLand(color, heightTex, ids, this.detail.uniforms);
    this.clouds = createClouds();
    this.stars = createStars();
    this.scene.add(this.ocean, this.land.mesh, createAtmosphere(), this.clouds, this.stars);
    (this.stars.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = this.pixelRatio;

    // land height under each spot, so models sit right on the ground
    const heightAt = (lat: number, lon: number) => 1 + LAND_LIFT + LAND_HEIGHT * sampleGrid(terrain, terrain.height, lat, lon);
    this.heightAt = heightAt;
    this.things = new ThingLayer(heightAt);
    this.scene.add(this.things.group);
    this.props = new PropLayer(terrain, () => this.detail.getNature(), heightAt);
    this.scene.add(this.props.group);
    this.vehicles = new VehicleLayer(heightAt);
    this.scene.add(this.vehicles.group);

    buildOceanGrid(list);
    this.buildLabels(list);

    // Upload everything to the GPU now rather than on the first frame.
    this.renderer.compile(this.scene, this.camera);
  }

  private buildLabels(list: Country[]) {
    for (const c of Object.values(CONTINENTS))
      this.labels.add({ kind: 'continent', text: c.name, lat: c.lat, lon: c.lon, size: 1, ref: { continent: c.name } });
    for (const w of WATER_LABELS)
      this.labels.add({ kind: w.big ? 'ocean' : 'sea', text: WATERS[w.id].name, lat: w.lat, lon: w.lon, size: w.big ? 1 : 0.5, ref: { water: w.id } });
    for (const c of list) {
      if (c.name === 'Antarctica' || c.name === 'Siachen Glacier') continue;
      const size = Math.sqrt(c.area / Math.PI);
      this.labels.add({ kind: 'country', text: c.name, lat: c.centroid[1], lon: c.centroid[0], size, ref: { country: c } });
      // very wide countries get a second name so you can see it from either end
      for (const [lat, lon] of EXTRA_LABEL_SPOTS[c.name] ?? [])
        this.labels.add({ kind: 'country', text: c.name, lat, lon, size: size * 0.6, ref: { country: c } });
      const f = factsFor(c);
      if (f?.capital && f.independent)
        this.labels.add({ kind: 'capital', text: f.capital.name, lat: f.capital.lat, lon: f.capital.lon, size, ref: { capital: c } });
    }
    this.labels.measure();
  }

  start() {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------------------------------------------------------------- controls

  private touched() {
    this.lastInteraction = performance.now();
    this.controls.autoRotate = false;
    this.flight = null;
    this.zoomGoal = null;
  }

  private distance() {
    return this.orbitPos.length();
  }

  /** Camera distance from the planet centre, ignoring tilt. */
  get orbitDistance() {
    return this.orbitPos.length();
  }

  zoomBy(factor: number) {
    this.touched();
    const base = this.zoomGoal ?? this.distance();
    this.zoomGoal = THREE.MathUtils.clamp(1 + (base - 1) * factor, MIN_DIST, MAX_DIST);
  }

  goHome() {
    const dir = this.orbitPos.clone().normalize();
    const [lon] = vec3ToLonLat(dir);
    this.flyTo(lon, 20, HOME_DIST);
  }

  /** Smoothly swing the camera over a spot on the globe. */
  flyTo(lon: number, lat: number, dist?: number) {
    this.touched();
    const from = this.orbitPos.clone().normalize();
    const to = latLonToVec3(lat, lon, 1).normalize();
    const angle = from.angleTo(to);
    this.flight = {
      from,
      to,
      fromDist: this.distance(),
      toDist: dist ?? this.distance(),
      t: 0,
      duration: 0.7 + angle * 0.45,
    };
  }

  /** A comfortable viewing distance for a country of this size. */
  distanceFor(c: Country) {
    const radius = Math.sqrt(c.area / Math.PI); // angular radius in radians
    return THREE.MathUtils.clamp(1 + radius * 6, 1.65, 3.2);
  }

  select(c: Country | null) {
    this.land.uniforms.uSelected.value = c ? c.index : -1;
  }

  private setupTapping() {
    let down: { x: number; y: number; t: number } | null = null;
    let pointers = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      pointers++;
      down = pointers === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    });
    const up = (e: PointerEvent) => {
      pointers = Math.max(0, pointers - 1);
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 600;
      down = null;
      if (moved < 12 && quick) this.handleTap(e.clientX, e.clientY);
    };
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', () => {
      pointers = Math.max(0, pointers - 1);
      down = null;
    });
  }

  private handleTap(x: number, y: number) {
    const vehicle = this.vehicles.hitTest(x, y, this.camera, this.width, this.height);
    if (vehicle) return this.events.onVehicleTap?.(vehicle);
    const thing = this.things.hitTest(x, y, this.camera, this.width, this.height);
    if (thing) return this.events.onThingTap?.(thing);
    const label = this.labels.hitTest(x, y);
    if (label) return this.events.onLabelTap?.(label);
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.ray.intersectSphere(this.pickSphere, new THREE.Vector3());
    if (!hit) return this.events.onEmptyTap?.();
    const [lon, lat] = vec3ToLonLat(hit);
    const c = countryAt(lon, lat);
    if (c) return this.events.onCountryTap?.(c);
    const water = waterAt(lon, lat);
    if (water) return this.events.onWaterTap?.(water);
    this.events.onEmptyTap?.();
  }

  // ---------------------------------------------------------------- loop

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the whole globe in view on tall (portrait) screens
    this.camera.fov = w < h ? 40 * Math.min(1.5, h / w) : 40;
    this.camera.updateProjectionMatrix();
  }

  private frame() {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    const t = this.timer.getElapsed();

    this.vehicles.advance(dt);
    let d: number;
    if (this.vehicles.riding) {
      d = this.updateRide(dt);
    } else {
      // Work in un-tilted "orbit" space; the tilt is added just before drawing.
      this.camera.position.copy(this.orbitPos);
      this.camera.quaternion.copy(this.orbitQuat);

      this.updateFlight(dt);
      this.updateZoom(dt);

      // Slow spin when nobody has touched it for a while.
      if (!this.flight && performance.now() - this.lastInteraction > 12000) this.controls.autoRotate = true;

      // Turning should feel the same whether zoomed in or out.
      d = this.distance();
      this.controls.rotateSpeed = THREE.MathUtils.clamp((d - 1) * 0.42, 0.04, 0.9);
      this.controls.update(dt);
      this.orbitPos.copy(this.camera.position);
      this.orbitQuat.copy(this.camera.quaternion);
      this.applyTilt(d);
    }
    const [viewLon, viewLat] = vec3ToLonLat(this.orbitPos);
    this.detail.update(viewLon, viewLat, d, dt);

    // Sun hangs over the camera's shoulder so the side you look at is always sunny.
    const lightDir = LIGHT_OFFSET.clone().applyQuaternion(this.camera.quaternion);
    this.sun.position.copy(lightDir).multiplyScalar(10);
    this.ocean.material.uniforms.uLightDir.value.copy(lightDir);
    this.ocean.material.uniforms.uTime.value = t;
    this.land.uniforms.uTime.value = t;
    (this.stars.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

    // Clouds drift, and fade away when you zoom in close.
    this.clouds.rotation.y += dt * 0.006;
    const cloudMat = this.clouds.userData.material as THREE.MeshStandardMaterial;
    cloudMat.opacity = THREE.MathUtils.smoothstep(d, 2.0, 2.6);
    this.clouds.visible = cloudMat.opacity > 0.01;

    this.vehicles.update(this.camera, d, dt);
    this.things.update(this.camera, d, dt);
    this.props.update(this.camera, viewLat, viewLon, d, dt);
    this.labels.update(this.camera, this.width, this.height, dt);
    this.renderer.render(this.scene, this.camera);
    this.checkQuality(dt);
  }

  // ---------------------------------------------------------------- ride along

  ride(v: Vehicle) {
    this.touched();
    this.vehicles.riding = v;
    this.controls.enabled = false;
    this.controls.autoRotate = false;
    this.rideCam.copy(this.camera.position);
    this.rideLook.set(0, 0, 0);
  }

  stopRide() {
    const v = this.vehicles.riding;
    if (!v) return;
    this.vehicles.riding = null;
    this.controls.enabled = true;
    // hand back to the normal globe view right above where we were
    const [lon, lat] = vec3ToLonLat(v.pos);
    this.orbitPos.copy(this.camera.position);
    this.camera.lookAt(0, 0, 0);
    this.orbitQuat.copy(this.camera.quaternion);
    this.flyTo(lon, lat, 1.7);
    this.events.onRideEnd?.();
  }

  /** Chase camera: just behind and above the vehicle, looking where it's going. */
  private updateRide(dt: number): number {
    const v = this.vehicles.riding!;
    const sc = rideScale(v);
    const plane = v.route.kind === 'plane';
    const train = v.route.kind === 'train';
    // a little lower and closer for trains, so the scenery feels big
    const back = sc * (plane ? 9 : train ? 6 : 8);
    const high = sc * (plane ? 3.2 : train ? 3.0 : 3.8);
    const target = v.pos.clone().addScaledVector(v.fwd, -back).addScaledVector(v.up, high);
    // never dip below the ground
    const minR = v.pos.length() + sc * 0.8;
    if (target.length() < minR) target.setLength(minR);
    const look = v.pos.clone().addScaledVector(v.fwd, sc * 5).addScaledVector(v.up, sc * 0.6);
    const k = 1 - Math.exp(-dt * 3.5);
    if (this.rideLook.lengthSq() === 0) this.rideLook.copy(look);
    this.rideCam.lerp(target, k);
    this.rideLook.lerp(look, k);
    this.camera.position.copy(this.rideCam);
    this.camera.up.copy(v.up);
    this.camera.lookAt(this.rideLook);
    this.camera.up.set(0, 1, 0);
    this.camera.updateMatrixWorld();
    this.orbitPos.copy(this.camera.position);
    return this.camera.position.length();
  }

  /**
   * Close to the ground, swing the camera down and look out towards the horizon,
   * pivoting around the spot in the middle of the screen so it stays put.
   */
  private applyTilt(d: number) {
    const k = THREE.MathUtils.smoothstep(TILT_START - d, 0, TILT_START - MIN_DIST);
    if (k <= 0) return;
    const angle = TILT_MAX * k;
    const pivot = this.orbitPos.clone().normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const q = new THREE.Quaternion().setFromAxisAngle(right, angle);
    const offset = this.camera.position.clone().sub(pivot).applyQuaternion(q);
    this.camera.position.copy(pivot).add(offset);
    this.camera.quaternion.premultiply(q);
    this.camera.updateMatrixWorld();
  }

  private updateFlight(dt: number) {
    const f = this.flight;
    if (!f) return;
    f.t = Math.min(1, f.t + dt / f.duration);
    const k = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2; // ease in-out
    const dir = new THREE.Vector3().copy(f.from).lerp(f.to, k);
    // proper great-circle swing
    const q = new THREE.Quaternion().setFromUnitVectors(f.from, f.to);
    const qk = new THREE.Quaternion().slerp(q, k);
    dir.copy(f.from).applyQuaternion(qk);
    // lift up a little in the middle of long trips so it feels like a hop
    const hop = Math.sin(Math.PI * k) * Math.min(0.6, f.from.angleTo(f.to) * 0.35);
    const dist = THREE.MathUtils.lerp(f.fromDist, f.toDist, k) + hop;
    this.camera.position.copy(dir.multiplyScalar(dist));
    if (f.t >= 1) this.flight = null;
  }

  private updateZoom(dt: number) {
    if (this.zoomGoal === null) return;
    const d = this.distance();
    const next = THREE.MathUtils.damp(d, this.zoomGoal, 6, dt);
    this.camera.position.setLength(next);
    if (Math.abs(next - this.zoomGoal) < 0.002) this.zoomGoal = null;
  }

  /** If the tablet is struggling, drop resolution a notch (twice at most). */
  private checkQuality(dt: number) {
    if (this.qualityChecked >= 2) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 120) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.frameTimes = [];
    if (median > 1 / 45 && this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.5);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.resize();
      (this.stars.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = this.pixelRatio;
      this.qualityChecked++;
    } else {
      this.qualityChecked = 2;
    }
  }
}
