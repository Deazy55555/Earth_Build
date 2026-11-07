import * as THREE from 'three';
import { Kit } from './kit';
import { LANDMARKS } from './landmarks';
import { ANIMALS } from './animals';
import { SEA } from './sea';
import { DINOS } from './dinos';
import { SPACE } from './space';
import { BOATS } from './boats';
import { VEHICLES } from './vehicles';

export const BUILDERS: Record<string, (k: Kit) => void> = { ...LANDMARKS, ...ANIMALS, ...SEA, ...DINOS, ...SPACE, ...BOATS, ...VEHICLES };

const cache = new Map<string, { group: THREE.Group; radius: number; center: THREE.Vector3 }>();

/**
 * Build a model by id. Returned group is scaled so its bounding sphere has radius 1,
 * with its base (y = 0 in model space) kept at the group origin.
 */
export function buildModel(id: string): THREE.Group {
  let entry = cache.get(id);
  if (!entry) {
    const k = new Kit();
    BUILDERS[id](k);
    const group = k.build();
    const box = new THREE.Box3().setFromObject(group);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    entry = { group, radius: sphere.radius, center: sphere.center };
    cache.set(id, entry);
  }
  const g = entry.group.clone(); // shares geometry
  g.scale.setScalar(1 / entry.radius);
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.userData.layers = Object.fromEntries(g.children.filter((c) => c.name).map((c) => [c.name, c]));
  return wrap;
}
