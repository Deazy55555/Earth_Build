import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];

export interface PartOpts {
  /** centre of the part */
  at?: V3;
  /** rotation in degrees */
  rot?: V3;
  scale?: V3;
}

/** One shared toy material: flat-shaded plastic using per-vertex colours. */
export const TOY_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.68,
  metalness: 0.0,
  side: THREE.DoubleSide, // so open shapes like radio dishes show from inside too
});

const tmpColor = new THREE.Color();
const DEG = Math.PI / 180;

interface Layer {
  pivot: V3;
  parts: THREE.BufferGeometry[];
}

/**
 * A tiny toolbox for building chunky low-poly toys out of boxes, cylinders and balls.
 * Parts are merged into one mesh per layer; layers can be animated (wheels, blades, tails…).
 */
export class Kit {
  private layers = new Map<string, Layer>([['body', { pivot: [0, 0, 0], parts: [] }]]);
  private current = 'body';

  /** Put the following parts in a separate movable piece that turns around `pivot`. */
  layer(name: string, pivot: V3 = [0, 0, 0]): this {
    if (!this.layers.has(name)) this.layers.set(name, { pivot, parts: [] });
    this.current = name;
    return this;
  }

  body(): this {
    this.current = 'body';
    return this;
  }

  private add(geo: THREE.BufferGeometry, color: string, o: PartOpts = {}): this {
    const g = geo.index ? geo.toNonIndexed() : geo;
    geo.dispose();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...(o.at ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...((o.rot ?? [0, 0, 0]).map((d) => d * DEG) as V3))),
      new THREE.Vector3(...(o.scale ?? [1, 1, 1])),
    );
    const layer = this.layers.get(this.current)!;
    // parts in a layer are stored relative to the layer's pivot
    m.premultiply(new THREE.Matrix4().makeTranslation(-layer.pivot[0], -layer.pivot[1], -layer.pivot[2]));
    g.applyMatrix4(m);
    tmpColor.set(color);
    const n = g.getAttribute('position').count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cols.set([tmpColor.r, tmpColor.g, tmpColor.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.deleteAttribute('uv');
    layer.parts.push(g);
    return this;
  }

  box(color: string, size: V3, o?: PartOpts) {
    return this.add(new THREE.BoxGeometry(...size), color, o);
  }
  /** cylinder centred on `at` (radiusTop, radiusBottom, height) */
  cyl(color: string, rTop: number, rBottom: number, h: number, o?: PartOpts, seg = 10) {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, seg), color, o);
  }
  cone(color: string, r: number, h: number, o?: PartOpts, seg = 10) {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, o);
  }
  /** four-sided pyramid with a square base of side `base` */
  pyramid(color: string, base: number, h: number, o?: PartOpts) {
    const g = new THREE.ConeGeometry(base / Math.SQRT2, h, 4);
    g.rotateY(Math.PI / 4);
    return this.add(g, color, o);
  }
  ball(color: string, r: number, o?: PartOpts, detail = 1) {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, o);
  }
  dome(color: string, r: number, o?: PartOpts, seg = 12) {
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(3, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2), color, o);
  }
  torus(color: string, R: number, r: number, o?: PartOpts, arc = Math.PI * 2, seg = 16) {
    return this.add(new THREE.TorusGeometry(R, r, 6, seg, arc), color, o);
  }
  /** a wedge/ramp: box whose top slopes from full height at -x to zero at +x */
  wedge(color: string, size: V3, o?: PartOpts) {
    const [w, h, d] = size;
    const shape = new THREE.Shape([new THREE.Vector2(-w / 2, -h / 2), new THREE.Vector2(w / 2, -h / 2), new THREE.Vector2(-w / 2, h / 2)]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return this.add(g, color, o);
  }
  /** a custom outline (in x/y) pushed out along z */
  extrude(color: string, pts: [number, number][], depth: number, o?: PartOpts) {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return this.add(g, color, o);
  }

  /** Merge everything into a Group: one mesh per layer, each layer in its own pivot. */
  build(): THREE.Group {
    const group = new THREE.Group();
    for (const [name, layer] of this.layers) {
      if (!layer.parts.length) continue;
      const geo = mergeGeometries(layer.parts, false)!;
      layer.parts.forEach((p) => p.dispose());
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, TOY_MATERIAL);
      if (name === 'body') {
        group.add(mesh);
      } else {
        const pivot = new THREE.Group();
        pivot.name = name;
        pivot.position.set(...layer.pivot);
        pivot.add(mesh);
        group.add(pivot);
      }
    }
    return group;
  }
}

// Handy colours
export const C = {
  white: '#ffffff',
  cream: '#fff4dc',
  sand: '#f2d7a0',
  stone: '#d9cdb8',
  grey: '#9aa3ad',
  darkGrey: '#5b6470',
  black: '#2d2f36',
  red: '#e8454f',
  orange: '#ff8a3d',
  yellow: '#ffd23f',
  gold: '#f5c542',
  green: '#5cc96b',
  darkGreen: '#2f9e55',
  leaf: '#7ed957',
  blue: '#3d8bff',
  navy: '#24407a',
  sky: '#8fd3ff',
  teal: '#1fb5a8',
  brown: '#9b6a43',
  darkBrown: '#6b452b',
  tan: '#d9a66c',
  pink: '#ff9ec7',
  purple: '#9b7bff',
  snow: '#f7fbff',
  ice: '#dff4ff',
  copper: '#7fd1b9',
  rock: '#b98a64',
  steel: '#b8c2cc',
};
