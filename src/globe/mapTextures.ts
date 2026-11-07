import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import type { Country } from '../data/countries';
import { ICE } from '../data/palette';

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

function boxBlurWrap(src: Float32Array, w: number, h: number, r: number): Float32Array {
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
