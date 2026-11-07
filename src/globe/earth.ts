import * as THREE from 'three';
import { DETAIL_GLSL, type DetailUniforms } from './detail';

export const LAND_LIFT = 0.0018; // tiny islands sit just above the water
export const LAND_HEIGHT = 0.02; // tallest mountains (Everest) — very exaggerated so kids can see them

export interface Land {
  mesh: THREE.Mesh;
  uniforms: {
    uIdMap: { value: THREE.Texture };
    uSelected: { value: number };
    uSelState: { value: number };
    /** 1 for each state found in the states game (index 1..50) */
    uStateMarks: { value: number[] };
    uMarkOn: { value: number };
    uTime: { value: number };
  };
}

/**
 * The land shell: a sphere that's pushed outwards where there's land,
 * with the ocean cut away so the animated water sphere shows through.
 */
export function createLand(color: THREE.Texture, heightMap: THREE.Texture, ids: THREE.Texture, detail: DetailUniforms, segments = 768): Land {
  const uniforms = {
    uIdMap: { value: ids },
    uSelected: { value: -1 },
    uSelState: { value: -1 },
    uStateMarks: { value: new Array(51).fill(0) },
    uMarkOn: { value: 0 },
    uTime: { value: 0 },
  };

  const mat = new THREE.MeshStandardMaterial({
    map: color,
    alphaTest: 0.5,
    displacementMap: heightMap,
    displacementScale: LAND_HEIGHT,
    displacementBias: LAND_LIFT,
    bumpMap: heightMap,
    bumpScale: 3.5,
    roughness: 0.82,
    metalness: 0.0,
  });

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, detail);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D uIdMap;
         uniform float uSelected;
         uniform float uSelState;
         uniform float uStateMarks[51];
         uniform float uMarkOn;
         uniform float uTime;
         uniform sampler2D uDetailMap;
         uniform vec4 uDetailWin;
         uniform float uDetailOn;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         ${DETAIL_GLSL}
         {
           vec4 idc = texture2D(uIdMap, vMapUv);
           float cid = floor(idc.r * 255.0 + 0.5);
           float sid = floor(idc.g * 255.0 + 0.5);
           // states game: states still to find go pale, found ones stay bright
           if (uMarkOn > 0.0 && sid > 0.5 && sid < 50.5) {
             float found = uStateMarks[int(sid)];
             float grey = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
             vec3 pale = mix(diffuseColor.rgb, vec3(grey * 0.55 + 0.42), 0.8);
             diffuseColor.rgb = mix(diffuseColor.rgb, pale, uMarkOn * (1.0 - found));
           }
           float pulse = 0.38 + 0.16 * sin(uTime * 4.0);
           if ((uSelected > 0.0 && abs(cid - uSelected) < 0.5) || (uSelState > 0.0 && abs(sid - uSelState) < 0.5)) {
             diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.98, 0.85), pulse);
           }
         }`,
      );
  };

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, segments / 2), mat);
  mesh.name = 'land';
  return { mesh, uniforms };
}

/** Soft blue glow around the planet. */
export function createAtmosphere(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color('#7fc8ff') } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        // We see the inside of the far wall: -dot is ~0.5 at the planet's edge, 0 at the halo's edge.
        float d = -dot(vN, vV);
        float glow = pow(clamp(d * 1.9, 0.0, 1.0), 2.2) * 0.9;
        gl_FragColor = vec4(uColor * glow, glow);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.16, 96, 48), mat);
  mesh.name = 'atmosphere';
  return mesh;
}
