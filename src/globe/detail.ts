import * as THREE from 'three';
import { feature, mesh } from 'topojson-client';
import { loadStates, statesTopology, USA_ID } from '../data/states';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import { geoBounds, geoEquirectangular, geoPath, geoCentroid, geoArea } from 'd3-geo';
import { countryAt, type Country } from '../data/countries';
import { ICE } from '../data/palette';
import { buildNature, type Nature } from './nature';
import type { Terrain } from './mapTextures';

const SAND = '#f6e3b4';
const MAX_W = 4096;
const MAX_H = 2048;

interface DetailFeature {
  feature: Feature<Geometry>;
  color: string;
  bounds: [[number, number], [number, number]];
  isUS?: boolean;
}

export interface DetailUniforms {
  uDetailMap: { value: THREE.Texture | null };
  uDetailWin: { value: THREE.Vector4 };
  uDetailOn: { value: number };
}

/** Some tiny shapes come out inside-out after simplification (covering the whole planet); flip them back. */
function fixWinding(f: Feature<Geometry>): Feature<Geometry> {
  const g = f.geometry;
  const flip = (rings: number[][][]) => {
    const poly: Feature<Geometry> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: rings } };
    return geoArea(poly) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings;
  };
  if (g.type === 'Polygon') return { ...f, geometry: { type: 'Polygon', coordinates: flip(g.coordinates) } };
  if (g.type === 'MultiPolygon') return { ...f, geometry: { type: 'MultiPolygon', coordinates: g.coordinates.map(flip) } };
  return f;
}

/**
 * When you zoom in close, paints a sharp map of just the area you're looking at
 * (using Natural Earth's most detailed 1:10m borders) and blends it over the globe.
 */
export class DetailPatch {
  readonly uniforms: DetailUniforms = {
    uDetailMap: { value: null },
    uDetailWin: { value: new THREE.Vector4(0, 0, 0, 0) },
    uDetailOn: { value: 0 },
  };
  private features: DetailFeature[] | null = null;
  private lakes: Feature<Geometry>[] = [];
  private rivers: { f: Feature<Geometry>; rank: number; bounds: [[number, number], [number, number]] }[] = [];
  private nature: Nature | null = null;
  private loading = false;
  private canvas = document.createElement('canvas');
  private texture: THREE.CanvasTexture | null = null;
  private win = { lon: 0, lat: 0, lonSpan: 0, latSpan: 0 };
  private pending = false;
  private broken = false;
  private stateLines: ReturnType<typeof mesh> | null = null;

  constructor(private countries: Country[], private maxAnisotropy: number, private terrain: Terrain) {}

  getNature() {
    return this.nature;
  }

  private async load() {
    this.loading = true;
    const topo = (await import('world-atlas/countries-10m.json')).default as unknown as Topology<{
      countries: GeometryCollection<{ name: string }>;
    }>;
    const byId = new Map(this.countries.map((c) => [c.id, c]));
    const fc = feature(topo, topo.objects.countries);
    const geoms = topo.objects.countries.geometries;
    const features: DetailFeature[] = fc.features.map((raw, i) => {
      const f = fixWinding(raw as Feature<Geometry>);
      const name = (f.properties as { name: string }).name;
      const id = (geoms[i].id as string | undefined) ?? name;
      let c = byId.get(id);
      if (!c) {
        const [lon, lat] = geoCentroid(f);
        c = countryAt(lon, lat) ?? undefined;
      }
      const color = c ? (c.name === 'Antarctica' ? ICE : c.color) : '#c3e88d';
      return { feature: f, color, bounds: geoBounds(f) as [[number, number], [number, number]], isUS: id === USA_ID };
    });
    // rivers and lakes (Natural Earth 1:10m)
    const [riversTopo, lakesTopo] = await Promise.all([import('../data/geo/rivers10.json'), import('../data/geo/lakes10.json')]);
    const fcOf = (t: unknown) => {
      const topo = t as Topology<{ [k: string]: GeometryCollection<{ scalerank: number }> }>;
      return feature(topo, topo.objects[Object.keys(topo.objects)[0]]).features as Feature<Geometry, { scalerank: number }>[];
    };
    this.lakes = fcOf(lakesTopo.default).filter((f) => f.geometry).map(fixWinding);
    this.rivers = fcOf(riversTopo.default).filter((f) => f.geometry).map((f) => ({ f, rank: f.properties.scalerank ?? 8, bounds: geoBounds(f) as [[number, number], [number, number]] }));
    this.nature = buildNature(this.terrain);
    this.features = features; // ready to draw
  }

  /** Call every frame with where the camera is looking and how far away it is. */
  update(lon: number, lat: number, dist: number, dt: number) {
    const on = dist < 1.8;
    const u = this.uniforms;
    u.uDetailOn.value = THREE.MathUtils.damp(u.uDetailOn.value, on && this.texture && !this.broken ? 1 : 0, 6, dt);
    if (this.broken) return;
    if (!on) return;
    if (!this.features) {
      if (!this.loading) this.load();
      return;
    }
    const latSpan = THREE.MathUtils.clamp((dist - 1) * 55, 6, 42);
    const lonSpan = Math.min(170, (latSpan * 1.7) / Math.max(0.3, Math.cos((lat * Math.PI) / 180)));
    const w = this.win;
    const dLon = Math.abs(((lon - w.lon + 540) % 360) - 180);
    const moved = dLon > w.lonSpan * 0.22 || Math.abs(lat - w.lat) > w.latSpan * 0.22;
    const rezoomed = latSpan < w.latSpan * 0.7 || latSpan > w.latSpan * 1.05;
    if ((moved || rezoomed || !this.texture) && !this.pending) {
      this.pending = true;
      // draw on the next tick so a busy frame isn't made longer
      setTimeout(() => {
        try {
          this.draw(lon, THREE.MathUtils.clamp(lat, -80 + latSpan / 2, 80 - latSpan / 2), lonSpan, latSpan * 1.25);
        } catch (e) {
          // never leave a half-drawn close-up on the globe: use the normal map instead
          console.warn('close-up map failed', e);
          this.broken = true;
          this.uniforms.uDetailOn.value = 0;
        }
        this.pending = false;
      }, 0);
    }
  }

  private draw(lonC: number, latC: number, lonSpan: number, latSpan: number) {
    const ppd = Math.min(MAX_W / lonSpan, MAX_H / latSpan, 110); // pixels per degree
    const W = Math.round(lonSpan * ppd);
    const H = Math.round(latSpan * ppd);
    const canvas = this.canvas;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const scale = (ppd * 180) / Math.PI;
    const proj = geoEquirectangular()
      .rotate([-lonC, 0])
      .scale(scale)
      .translate([W / 2, H / 2 + (latC * Math.PI) / 180 * scale])
      .precision(0.05);
    const path = geoPath(proj, ctx);

    const lon0 = lonC - lonSpan / 2 - 2;
    const lon1 = lonC + lonSpan / 2 + 2;
    const lat0 = latC - latSpan / 2 - 2;
    const lat1 = latC + latSpan / 2 + 2;
    const inLon = (a: number, b: number) => {
      // does [a,b] (may wrap) overlap [lon0, lon1] (may exceed ±180)?
      for (const k of [-360, 0, 360]) {
        const x0 = a + k;
        const x1 = (b >= a ? b : b + 360) + k;
        if (x0 <= lon1 && x1 >= lon0) return true;
      }
      return false;
    };
    const visible = this.features!.filter(
      (f) => f.bounds[1][1] >= lat0 && f.bounds[0][1] <= lat1 && inLon(f.bounds[0][0], f.bounds[1][0]),
    );

    const px = ppd / 11.4; // relative to the 4096-wide world map
    const lw = (n: number) => Math.max(n, n * Math.min(px, 3.2));
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // sandy beaches (outer half shows past the coast)
    ctx.strokeStyle = SAND;
    ctx.lineWidth = lw(4);
    ctx.beginPath();
    for (const f of visible) path(f.feature);
    ctx.stroke();

    // the real-looking ground, cut to the detailed coastline
    const n = this.nature!;
    ctx.save();
    ctx.beginPath();
    for (const f of visible) path(f.feature);
    ctx.clip();
    const latTop = latC + latSpan / 2;
    const sy = ((90 - latTop) / 180) * n.h;
    const sh = (latSpan / 180) * n.h;
    // solid ground first: if the natural colours fail to draw (iPads can be
    // short on canvas memory) the land must never turn see-through, or the
    // ocean underneath shows up as a big blue patch
    ctx.fillStyle = '#8fbf5f';
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const l0 = lonC - lonSpan / 2;
    const l1 = lonC + lonSpan / 2;
    for (const k of [-360, 0, 360]) {
      const a = Math.max(l0, -180 + k);
      const b = Math.min(l1, 180 + k);
      if (b <= a) continue;
      // keep the source box inside the picture (Safari draws nothing otherwise)
      const sx = Math.max(0, ((a - k + 180) / 360) * n.w);
      const sw = Math.min(n.w - sx, ((b - a) / 360) * n.w);
      const y0 = Math.max(0, sy);
      const y1 = Math.min(n.h, sy + sh);
      if (sw <= 0 || y1 <= y0) continue;
      const dy0 = ((y0 - sy) / sh) * H;
      const dy1 = ((y1 - sy) / sh) * H;
      ctx.drawImage(n.canvas, sx, y0, sw, y1 - y0, (a - l0) * ppd, dy0, (b - a) * ppd, dy1 - dy0);
    }
    // a light wash of each country's toy colour so you can still tell them apart
    ctx.globalAlpha = 0.24;
    for (const f of visible) {
      if (f.isUS) continue; // the states get their own colours below
      ctx.fillStyle = f.color;
      ctx.beginPath();
      path(f.feature);
      ctx.fill();
    }
    const usVisible = visible.some((f) => f.isUS);
    if (usVisible) {
      ctx.globalAlpha = 0.3;
      for (const st of loadStates()) {
        if (st.bounds[1][1] < lat0 || st.bounds[0][1] > lat1 || !inLon(st.bounds[0][0], st.bounds[1][0])) continue;
        ctx.fillStyle = ctx.strokeStyle = st.color;
        ctx.lineWidth = lw(4);
        ctx.beginPath();
        path(st.feature);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // lakes and rivers
    const water = '#4aa6e6';
    ctx.fillStyle = water;
    ctx.strokeStyle = '#d9f1ff';
    ctx.lineWidth = lw(0.8);
    for (const f of this.lakes) {
      ctx.beginPath();
      path(f);
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = water;
    for (const r of this.rivers) {
      if (r.bounds[1][1] < lat0 || r.bounds[0][1] > lat1 || !inLon(r.bounds[0][0], r.bounds[1][0])) continue;
      ctx.lineWidth = lw(Math.max(0.7, 2.6 - r.rank * 0.22));
      ctx.beginPath();
      path(r.f);
      ctx.stroke();
    }

    // borders: soft dashed white lines
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = lw(1.3);
    ctx.setLineDash([lw(5), lw(3.5)]);
    for (const f of visible) {
      ctx.beginPath();
      path(f.feature);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // state lines: thinner and lighter than the country borders
    if (usVisible) {
      const us = visible.find((f) => f.isUS)!;
      const topo = statesTopology();
      ctx.save();
      ctx.beginPath();
      path(us.feature);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = lw(0.9);
      ctx.setLineDash([lw(3), lw(2.5)]);
      ctx.beginPath();
      path(this.stateLines ??= mesh(topo, topo.objects.states, (a, b) => a !== b));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    this.texture?.dispose();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.maxAnisotropy;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    this.texture = tex;
    this.win = { lon: lonC, lat: latC, lonSpan, latSpan };
    this.uniforms.uDetailMap.value = tex;
    this.uniforms.uDetailWin.value.set(
      (((lonC - lonSpan / 2 + 180) % 360) + 360) % 360 / 360,
      (latC - latSpan / 2 + 90) / 180,
      lonSpan / 360,
      latSpan / 180,
    );
  }
}

/** GLSL that blends the detail patch over the base colour (inserted after <map_fragment>). */
export const DETAIL_GLSL = /* glsl */ `
  if (uDetailOn > 0.001) {
    float du = fract(vMapUv.x - uDetailWin.x);
    float dv = vMapUv.y - uDetailWin.y;
    if (du < uDetailWin.z && dv >= 0.0 && dv < uDetailWin.w) {
      vec2 duv = vec2(du / uDetailWin.z, dv / uDetailWin.w);
      vec4 dc = texture2D(uDetailMap, duv);
      vec2 e = min(duv, 1.0 - duv);
      float k = smoothstep(0.0, 0.1, min(e.x, e.y)) * uDetailOn;
      diffuseColor.rgb = mix(diffuseColor.rgb, dc.rgb, k * step(0.01, dc.a));
      diffuseColor.a = mix(diffuseColor.a, dc.a, k);
    }
  }
`;
