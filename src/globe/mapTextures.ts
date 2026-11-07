import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import type { Country } from '../data/countries';
import { ICE } from '../data/palette';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import rivers50 from '../data/geo/rivers50.json';
import lakes50 from '../data/geo/lakes50.json';

function featuresOf(t: unknown) {
  const topo = t as Topology<{ [k: string]: GeometryCollection<{ scalerank: number }> }>;
  return feature(topo, topo.objects[Object.keys(topo.objects)[0]]).features as Feature<Geometry, { scalerank: number }>[];
}

const SAND = '#f6e3b4';

function projectionFor(w: number, h: number) {
  return geoEquirectangular()
    .scale(w / (2 * Math.PI))
    .translate([w / 2, h / 2])
    .precision(0.1);
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: false })!;
  return [c, ctx];
}

function countryFill(c: Country) {
  return c.name === 'Antarctica' ? ICE : c.color;
}

/** Country colours with sandy beaches. Ocean is transparent (cut out in the shader). */
// iPad Safari caps a single canvas at ~16.7M pixels, so 4096×2048 is the safe max.
export function buildColorTexture(list: Country[], w = 4096, h = 2048): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(w, h);
  const path = geoPath(projectionFor(w, h), ctx);
  const s = w / 4096;

  // Sandy beach ring, drawn first so its outer half pokes out past the coastline.
  ctx.strokeStyle = SAND;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  for (const c of list) path(c.feature);
  ctx.stroke();

  for (const c of list) {
    ctx.fillStyle = countryFill(c);
    ctx.beginPath();
    path(c.feature);
    ctx.fill();
  }

  // big lakes and rivers
  ctx.fillStyle = '#4aa6e6';
  for (const f of featuresOf(lakes50)) {
    if ((f.properties.scalerank ?? 9) > 3) continue;
    ctx.beginPath();
    path(f);
    ctx.fill();
  }
  ctx.strokeStyle = '#4aa6e6';
  ctx.lineCap = 'round';
  for (const f of featuresOf(rivers50)) {
    const r = f.properties.scalerank ?? 9;
    if (r > 4) continue;
    ctx.lineWidth = (2.2 - r * 0.3) * s;
    ctx.beginPath();
    path(f);
    ctx.stroke();
  }

  // Soft white borders between countries.
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.6 * s;
  for (const c of list) {
    ctx.beginPath();
    path(c.feature);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/** Each country painted with its index in the red channel — used for the tap highlight. */
export function buildIdTexture(list: Country[], w = 4096, h = 2048): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(w, h);
  const path = geoPath(projectionFor(w, h), ctx);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  for (const c of list) {
    ctx.fillStyle = `rgb(${c.index},0,0)`;
    ctx.beginPath();
    path(c.feature);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export function boxBlurWrap(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const k = 1 / (2 * r + 1);
  // horizontal, wrapping around the date line
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += src[row + ((i + w) % w)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * k;
      acc += src[row + ((x + r + 1) % w)] - src[row + ((x - r + w) % w)];
    }
  }
  // vertical, clamped at the poles
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += tmp[Math.min(h - 1, Math.max(0, i)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * k;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/**
 * Land mask: R = gently blurred land (height, so land puffs up),
 * G = widely blurred land (shallow turquoise water near coasts).
 */
export function buildMaskTexture(list: Country[], w = 2048, h = 1024): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(w, h);
  const path = geoPath(projectionFor(w, h), ctx);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (const c of list) path(c.feature);
  ctx.fill();

  const img = ctx.getImageData(0, 0, w, h);
  const land = new Float32Array(w * h);
  for (let i = 0; i < land.length; i++) land[i] = img.data[i * 4] / 255;

  let height = boxBlurWrap(land, w, h, 3);
  height = boxBlurWrap(height, w, h, 3);
  let shallow = boxBlurWrap(land, w, h, 12);
  shallow = boxBlurWrap(shallow, w, h, 12);

  for (let i = 0; i < land.length; i++) {
    // ease the height so land has a soft rounded "pillow" edge
    const hgt = Math.min(1, height[i] * 1.6);
    img.data[i * 4] = Math.round(hgt * hgt * (3 - 2 * hgt) * 255);
    img.data[i * 4 + 1] = Math.round(Math.min(1, shallow[i] * 2.2) * 255);
    img.data[i * 4 + 2] = Math.round(land[i] * 255);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Everything we know about the ground, on a 2048×1024 lat/lon grid. */
export interface Terrain {
  w: number;
  h: number;
  /** 1 = land (sharp coastline) */
  land: Uint8Array;
  /** real elevation 0..1 (0 = sea level, 1 = Everest) */
  elev: Float32Array;
  /** final toy height 0..1 used to push the land up */
  height: Float32Array;
}

/** Loads NASA's topography map (land elevation as greyscale). */
export async function loadTopology(url: string): Promise<ImageData | null> {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const [c, ctx] = makeCanvas(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, c.width, c.height);
  } catch {
    return null;
  }
}

/**
 * Land height = a soft "pillow" so coasts round off nicely + real mountains from the
 * elevation map (exaggerated a lot so kids can see them).
 */
export function buildTerrain(mask: THREE.CanvasTexture, topo: ImageData | null): { terrain: Terrain; texture: THREE.CanvasTexture } {
  const src = mask.image as HTMLCanvasElement;
  const w = src.width;
  const h = src.height;
  const m = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  const land = new Uint8Array(w * h);
  const elev = new Float32Array(w * h);
  const height = new Float32Array(w * h);
  const [canvas, ctx] = makeCanvas(w, h);
  const out = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const pillow = m[i * 4] / 255;
      land[i] = m[i * 4 + 2] > 127 ? 1 : 0;
      let e = 0;
      if (topo) {
        const tx = Math.min(topo.width - 1, Math.floor((x / w) * topo.width));
        const ty = Math.min(topo.height - 1, Math.floor((y / h) * topo.height));
        e = Math.min(1, topo.data[(ty * topo.width + tx) * 4] / 245);
      }
      elev[i] = e;
      const hgt = pillow * 0.42 + Math.pow(e, 0.9) * 0.58 * Math.min(1, pillow * 1.6);
      height[i] = hgt;
      const v = Math.round(hgt * 255);
      out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v;
      out.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return { terrain: { w, h, land, elev, height }, texture };
}

/** Sample a terrain grid at lat/lon (nearest). */
export function sampleGrid(t: Terrain, arr: Float32Array | Uint8Array, lat: number, lon: number): number {
  const x = Math.min(t.w - 1, Math.max(0, Math.floor((((lon + 540) % 360) / 360) * t.w)));
  const y = Math.min(t.h - 1, Math.max(0, Math.floor(((90 - lat) / 180) * t.h)));
  return arr[y * t.w + x];
}
