import * as THREE from 'three';
import { latLonToVec3 } from './geo';

export type LabelKind = 'continent' | 'ocean' | 'sea' | 'country' | 'capital';

export interface LabelSpec {
  kind: LabelKind;
  text: string;
  lat: number;
  lon: number;
  /** angular size of the thing being labelled (radians) — bigger shows earlier */
  size: number;
  /** anything the tap handler needs */
  ref: unknown;
}

interface Label extends LabelSpec {
  el: HTMLDivElement;
  pos: THREE.Vector3;
  normal: THREE.Vector3;
  w: number;
  h: number;
  opacity: number;
  target: number;
  shown: boolean;
  sx: number;
  sy: number;
  priority: number;
}

const PRIORITY: Record<LabelKind, number> = { continent: 0, ocean: 1, country: 2, sea: 3, capital: 4 };
const SURFACE = 1.008;

/**
 * Names that float over the globe as crisp HTML text. Each frame we work out
 * which ones should be visible at this zoom, drop any that would overlap a more
 * important one, and fade them in and out.
 */
export class LabelLayer {
  private labels: Label[] = [];
  private v = new THREE.Vector3();
  private toCam = new THREE.Vector3();

  constructor(private root: HTMLElement) {}

  add(spec: LabelSpec) {
    const el = document.createElement('div');
    el.className = `label label-${spec.kind}`;
    if (spec.kind === 'capital') {
      el.innerHTML = '<span class="dot"></span><span class="txt"></span>';
      (el.querySelector('.txt') as HTMLElement).textContent = spec.text;
    } else {
      el.textContent = spec.text;
    }
    this.root.appendChild(el);
    const pos = latLonToVec3(spec.lat, spec.lon, SURFACE);
    this.labels.push({
      ...spec,
      el,
      pos,
      normal: pos.clone().normalize(),
      w: 0,
      h: 0,
      opacity: 0,
      target: 0,
      shown: false,
      sx: 0,
      sy: 0,
      priority: PRIORITY[spec.kind],
    });
  }

  /** Measure every label once (after fonts are ready). */
  measure() {
    for (const l of this.labels) {
      l.el.style.visibility = 'hidden';
      l.w = l.el.offsetWidth;
      l.h = l.el.offsetHeight;
    }
  }

  /** Should this label be visible at camera distance d (ignoring overlaps)? */
  private wanted(l: Label, d: number): boolean {
    const zoom = d - 1; // height above the surface
    switch (l.kind) {
      case 'continent':
        return d > 2.35;
      case 'ocean':
        return d > 1.45;
      case 'sea':
        return d < 2.6 && d > 1.25;
      case 'country':
        return d < 2.55 && l.size / zoom > 0.034;
      case 'capital':
        return d < 1.9 && (l.size / zoom > 0.1 || d < 1.4);
    }
  }

  update(camera: THREE.Camera, width: number, height: number, dt: number) {
    const camPos = camera.position;
    const d = camPos.length();
    const placed: [number, number, number, number][] = [];
    const candidates: Label[] = [];

    for (const l of this.labels) {
      l.target = 0;
      const want = this.wanted(l, d);
      if (!want && !l.shown) continue;
      // facing us? (fade out towards the edge of the planet)
      this.toCam.copy(camPos).sub(l.pos).normalize();
      const facing = this.toCam.dot(l.normal);
      if (facing < 0.25 && !l.shown) continue;
      // keep tracking labels that are fading out so they move with the globe
      this.v.copy(l.pos).project(camera);
      l.sx = (this.v.x * 0.5 + 0.5) * width;
      l.sy = (-this.v.y * 0.5 + 0.5) * height;
      if (!want || facing < 0.25 || this.v.z > 1) continue;
      if (l.sx < -l.w || l.sx > width + l.w || l.sy < -l.h || l.sy > height + l.h) continue;
      l.target = Math.min(1, (facing - 0.25) / 0.2);
      candidates.push(l);
    }

    // most important first; labels already on screen win ties so nothing flickers
    candidates.sort((a, b) => a.priority - b.priority || Number(b.shown) - Number(a.shown) || b.size - a.size);
    const pad = 6;
    for (const l of candidates) {
      const x0 = l.kind === 'capital' ? l.sx - 7 : l.sx - l.w / 2;
      const r: [number, number, number, number] = [x0 - pad, l.sy - l.h / 2 - pad, x0 + l.w + pad, l.sy + l.h / 2 + pad];
      const hit = placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1]);
      if (hit) l.target = 0;
      else placed.push(r);
    }

    const k = Math.min(1, dt * 7);
    for (const l of this.labels) {
      l.opacity += (l.target - l.opacity) * k;
      if (l.opacity < 0.02 && l.target === 0) {
        if (l.shown) {
          l.el.style.visibility = 'hidden';
          l.shown = false;
        }
        l.opacity = 0;
        continue;
      }
      if (!l.shown) {
        l.el.style.visibility = 'visible';
        l.shown = true;
      }
      const ox = l.kind === 'capital' ? -7 : -l.w / 2;
      l.el.style.transform = `translate3d(${(l.sx + ox).toFixed(1)}px, ${(l.sy - l.h / 2).toFixed(1)}px, 0)`;
      l.el.style.opacity = l.opacity.toFixed(3);
    }
  }

  /** The label under a tap, if any (most important first). */
  hitTest(x: number, y: number): LabelSpec | null {
    let best: Label | null = null;
    for (const l of this.labels) {
      if (!l.shown || l.opacity < 0.5) continue;
      const x0 = l.kind === 'capital' ? l.sx - 12 : l.sx - l.w / 2 - 6;
      const x1 = l.kind === 'capital' ? l.sx - 7 + l.w + 6 : l.sx + l.w / 2 + 6;
      if (x >= x0 && x <= x1 && y >= l.sy - l.h / 2 - 8 && y <= l.sy + l.h / 2 + 8) {
        if (!best || l.priority > best.priority) best = l; // prefer the more specific one
      }
    }
    return best;
  }
}
