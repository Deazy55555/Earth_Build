import * as THREE from 'three';
import { OCEAN_DEEP, OCEAN_SHALLOW } from '../data/palette';

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vObj;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vObj = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMask;
  uniform float uTime;
  uniform vec3 uLightDir;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  varying vec2 vUv;
  varying vec3 vObj;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float waves(vec3 p) {
    float t = uTime * 0.35;
    return noise(p * 110.0 + vec3(t, t * 0.7, -t)) * 0.5
         + noise(p * 260.0 - vec3(t * 1.3, 0.0, t)) * 0.3
         + noise(p * 600.0 + vec3(0.0, t * 2.0, t)) * 0.2;
  }

  void main() {
    vec3 mask = texture2D(uMask, vUv).rgb;
    float shallow = smoothstep(0.08, 1.0, mask.g) * 0.85;

    // gently bumpy water normal from animated noise
    vec3 N = normalize(vWorldNormal);
    vec3 T = normalize(cross(N, vec3(0.0, 1.0, 0.0)) + 1e-4);
    vec3 B = cross(N, T);
    float e = 0.0008;
    float h0 = waves(vObj);
    float hx = waves(vObj + T * e);
    float hy = waves(vObj + B * e);
    N = normalize(N - (T * (hx - h0) + B * (hy - h0)) * 0.35);

    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vWorldPos);

    vec3 col = mix(uDeep, uShallow, shallow);
    float diff = 0.62 + 0.38 * max(dot(N, L), 0.0);
    col *= diff;

    // sunny sparkles
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 160.0);
    col += vec3(1.0) * spec * 0.45;

    // one soft foam line that gently laps at the beach
    float coast = mask.r;
    float lap = 0.5 + 0.5 * sin(uTime * 1.2);
    float edge = mix(0.32, 0.42, lap);
    float foam = smoothstep(edge - 0.12, edge, coast) * (1.0 - smoothstep(edge, edge + 0.06, coast));
    col = mix(col, vec3(1.0), foam * 0.5);

    // soft bright rim towards the edge of the planet
    float fres = pow(1.0 - max(dot(normalize(vWorldNormal), V), 0.0), 3.0);
    col = mix(col, vec3(0.75, 0.93, 1.0), fres * 0.45);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createOcean(mask: THREE.Texture, segments = 192): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uMask: { value: mask },
      uTime: { value: 0 },
      uLightDir: { value: new THREE.Vector3(1, 1, 1) },
      uDeep: { value: new THREE.Color(OCEAN_DEEP) },
      uShallow: { value: new THREE.Color(OCEAN_SHALLOW) },
    },
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, segments / 2), mat);
  mesh.name = 'ocean';
  return mesh;
}
