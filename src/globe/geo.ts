import * as THREE from 'three';

/** Lat/lon (degrees) to a point matching three.js SphereGeometry UVs. */
export function latLonToVec3(lat: number, lon: number, r = 1, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) / 180) * Math.PI;
  return out.set(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}

/** Inverse of latLonToVec3. Returns [lon, lat] in degrees. */
export function vec3ToLonLat(v: THREE.Vector3): [number, number] {
  const n = v.clone().normalize();
  const lat = (Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)) * 180) / Math.PI;
  let lon = (Math.atan2(n.z, -n.x) * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  return [lon, lat];
}
