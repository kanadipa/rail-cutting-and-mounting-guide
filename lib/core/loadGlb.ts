import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const cache = new Map<string, Promise<THREE.Group>>();

/**
 * Loads a GLB and resolves a fresh copy of its scene.
 *
 * Each URL is fetched once; every call returns its own deep clone, materials included, so
 * changing or cutting one copy never affects another. A failed load is not cached, so it can
 * be retried.
 */
export function loadGlb(url: string): Promise<THREE.Group> {
  let pending = cache.get(url);
  if (!pending) {
    pending = new GLTFLoader().loadAsync(url).then((gltf) => gltf.scene);
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending.then(cloneWithMaterials, (err: unknown) => {
    throw new Error(`loadGlb: could not load ${url}: ${err instanceof Error ? err.message : String(err)}`);
  });
}

function cloneWithMaterials(source: THREE.Group): THREE.Group {
  const copy = source.clone(true);
  copy.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.material = Array.isArray(obj.material) ? obj.material.map((m) => m.clone()) : obj.material.clone();
  });
  return copy;
}
