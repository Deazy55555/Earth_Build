import * as THREE from 'three';
import { latLonToVec3 } from './geo';

/** Puffy toy clouds: little clusters of soft white balls drifting around the planet. */
export function createClouds(count = 30): THREE.Group {
  const group = new THREE.Group();
  group.name = 'clouds';
  const puffsPer = 7;
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 1,
    metalness: 0,
    emissive: '#c9dcff',
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 1,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count * puffsPer);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const centre = new THREE.Vector3();
  const tangentA = new THREE.Vector3();
  const tangentB = new THREE.Vector3();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  let rng = 12345;
  const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);

  let n = 0;
  for (let i = 0; i < count; i++) {
    // keep clouds mostly away from the poles
    const lat = (rand() * 2 - 1) * 62;
    const lon = rand() * 360 - 180;
    const r = 1.055 + rand() * 0.015;
    latLonToVec3(lat, lon, r, centre);
    const normal = centre.clone().normalize();
    tangentA.crossVectors(normal, up).normalize();
    tangentB.crossVectors(normal, tangentA).normalize();
    q.setFromUnitVectors(up, normal);
    const size = 0.02 + rand() * 0.016;
    for (let k = 0; k < puffsPer; k++) {
      const t = (k / (puffsPer - 1)) * 2 - 1; // -1..1 along the cloud
      const puff = size * (1.15 - Math.abs(t) * 0.55) * (0.85 + rand() * 0.3);
      p.copy(centre)
        .addScaledVector(tangentA, t * size * 2.1)
        .addScaledVector(tangentB, (rand() - 0.5) * size * 0.9)
        .addScaledVector(normal, puff * 0.35);
      s.set(puff, puff * 0.78, puff);
      m.compose(p, q, s);
      mesh.setMatrixAt(n++, m);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  group.userData.material = mat;
  return group;
}

/** Twinkling stars on a far-away shell. */
export function createStars(count = 2200): THREE.Points {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const size = new Float32Array(count);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.randomDirection().multiplyScalar(40 + Math.random() * 20);
    pos.set([v.x, v.y, v.z], i * 3);
    seed[i] = Math.random() * 100;
    size[i] = Math.random() < 0.06 ? 3.2 : 1.2 + Math.random() * 1.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vTw;
      void main() {
        vTw = 0.55 + 0.45 * sin(uTime * (0.8 + fract(aSeed) * 2.0) + aSeed);
        gl_PointSize = aSize * uPixelRatio * (0.8 + 0.4 * vTw);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vTw;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.97, 0.9), a * vTw);
      }
    `,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = 'stars';
  return pts;
}
