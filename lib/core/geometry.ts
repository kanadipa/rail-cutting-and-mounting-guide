/**
 * Low-level mesh helpers for bar-shaped GLBs (a DIN rail is modelled as a long bar).
 *
 * Everything works on raw vertex data in millimetres, so a scene is first passed through
 * `normalizeSceneGeometry`, which bakes every node transform into the vertices.
 *
 * You should not need to call these directly — `cutRailModel` does. They are exported in case
 * you want to measure a model yourself.
 */
import * as THREE from "three";

type AttrData = { array: Float32Array; itemSize: number; normalized: boolean };

/**
 * Rebuilds a geometry with plain, de-interleaved Float32 attributes. Reading through
 * getX/getY/getZ honours interleaving and the `normalized` flag, so the copy holds real values.
 */
function toPlainFloat32Geometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    const source = attr as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    const { itemSize, count } = source;
    const array = new Float32Array(count * itemSize);
    for (let i = 0; i < count; i += 1) {
      const base = i * itemSize;
      array[base] = source.getX(i);
      if (itemSize > 1) array[base + 1] = source.getY(i);
      if (itemSize > 2) array[base + 2] = source.getZ(i);
      if (itemSize > 3) array[base + 3] = source.getW(i);
    }
    out.setAttribute(name, new THREE.BufferAttribute(array, itemSize));
  }
  if (geometry.index) out.setIndex(Array.from(geometry.index.array as ArrayLike<number>));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

/**
 * Bakes every mesh's world transform into its vertices and resets every node transform, so the
 * raw vertex data reads as the model is displayed. Mutates and returns `scene`.
 */
export function normalizeSceneGeometry(scene: THREE.Object3D): THREE.Group {
  scene.updateMatrixWorld(true);
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const geo = toPlainFloat32Geometry(obj.geometry);
    geo.applyMatrix4(obj.matrixWorld);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    obj.geometry = geo;
  });
  scene.traverse((obj) => {
    obj.position.set(0, 0, 0);
    obj.quaternion.identity();
    obj.scale.set(1, 1, 1);
    obj.updateMatrix();
  });
  return scene as THREE.Group;
}

/** Min/max of every mesh vertex along each axis. Requires a normalized scene. */
export function getVertexBounds(scene: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  const p = new THREE.Vector3();
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const pos = obj.geometry?.attributes?.position;
    if (!(pos instanceof THREE.BufferAttribute)) return;
    for (let i = 0; i < pos.count; i += 1) box.expandByPoint(p.fromBufferAttribute(pos, i));
  });
  return box;
}

function applyMatrixToMeshes(scene: THREE.Object3D, matrix: THREE.Matrix4): void {
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry.applyMatrix4(matrix);
    obj.geometry.computeBoundingBox();
    obj.geometry.computeBoundingSphere();
  });
}

/**
 * Rotates a normalized bar so its length runs along +X and its broad face along Y (the thin
 * axis becomes Z, toward the viewer), then scales it uniformly so its X extent equals
 * `lengthMm` — some GLBs are modelled in metres, and the catalog bar length is the ground truth.
 */
export function orientAndScaleBar(scene: THREE.Group, lengthMm: number): THREE.Group {
  const size = getVertexBounds(scene).getSize(new THREE.Vector3());
  const extents = [size.x, size.y, size.z];
  const lengthAxis = extents.indexOf(Math.max(...extents));
  if (lengthAxis !== 0) {
    const from = new THREE.Vector3(lengthAxis === 0 ? 1 : 0, lengthAxis === 1 ? 1 : 0, lengthAxis === 2 ? 1 : 0);
    const q = new THREE.Quaternion().setFromUnitVectors(from, new THREE.Vector3(1, 0, 0));
    applyMatrixToMeshes(scene, new THREE.Matrix4().makeRotationFromQuaternion(q));
  }
  const s2 = getVertexBounds(scene).getSize(new THREE.Vector3());
  if (s2.z > s2.y) applyMatrixToMeshes(scene, new THREE.Matrix4().makeRotationX(Math.PI / 2));

  const lengthNow = getVertexBounds(scene).getSize(new THREE.Vector3()).x;
  if (!(lengthNow > 0)) throw new Error("orientAndScaleBar: the model has no extent along its length");
  const factor = lengthMm / lengthNow;
  if (Math.abs(factor - 1) > 1e-6) applyMatrixToMeshes(scene, new THREE.Matrix4().makeScale(factor, factor, factor));
  return scene;
}

// ---------------------------------------------------------------------------
// Clipping (Sutherland–Hodgman per triangle, so the cut face stays closed)
// ---------------------------------------------------------------------------

function readVertex(attr: AttrData, i: number): number[] {
  const out: number[] = new Array(attr.itemSize);
  for (let k = 0; k < attr.itemSize; k++) out[k] = attr.array[i * attr.itemSize + k];
  return out;
}

function lerpVertex(a: number[], b: number[], t: number): number[] {
  return a.map((v, k) => v + (b[k] - v) * t);
}

/** Keeps the geometry on the negative side of `plane`. Returns a new geometry; never mutates. */
function clipBufferGeometry(geometry: THREE.BufferGeometry, plane: THREE.Plane): THREE.BufferGeometry {
  const src = geometry.index ? geometry.toNonIndexed() : geometry;
  const attrs = new Map<string, AttrData>();
  for (const [name, attr] of Object.entries(src.attributes)) {
    if (attr instanceof THREE.BufferAttribute && attr.array instanceof Float32Array) {
      attrs.set(name, { array: attr.array, itemSize: attr.itemSize, normalized: attr.normalized });
    }
  }
  const posAttr = attrs.get("position");
  if (!posAttr) return src.clone();

  const triCount = Math.floor(posAttr.array.length / posAttr.itemSize / 3);
  const out = new Map<string, number[]>();
  attrs.forEach((_, name) => out.set(name, []));
  const emit = (i: number) => attrs.forEach((a, n) => out.get(n)!.push(...readVertex(a, i)));
  const emitLerp = (iA: number, iB: number, t: number) =>
    attrs.forEach((a, n) => out.get(n)!.push(...lerpVertex(readVertex(a, iA), readVertex(a, iB), t)));

  const p = new THREE.Vector3();
  const dist = (i: number) =>
    plane.distanceToPoint(
      p.set(
        posAttr.array[i * posAttr.itemSize],
        posAttr.array[i * posAttr.itemSize + 1],
        posAttr.array[i * posAttr.itemSize + 2],
      ),
    );
  const edgeT = (dA: number, dB: number) => {
    const denom = dA - dB;
    return Math.abs(denom) < 1e-12 ? 0 : dA / denom;
  };

  for (let tri = 0; tri < triCount; tri++) {
    const i0 = tri * 3;
    const i1 = i0 + 1;
    const i2 = i0 + 2;
    const d0 = dist(i0);
    const d1 = dist(i1);
    const d2 = dist(i2);
    const in0 = d0 <= 1e-9;
    const in1 = d1 <= 1e-9;
    const in2 = d2 <= 1e-9;
    const inside = (in0 ? 1 : 0) + (in1 ? 1 : 0) + (in2 ? 1 : 0);
    if (inside === 0) continue;
    if (inside === 3) {
      emit(i0);
      emit(i1);
      emit(i2);
      continue;
    }
    if (inside === 1) {
      // The rotation keeps the original winding whichever vertex is inside.
      const [iIn, dIn, iA, dA, iB, dB] = in0
        ? [i0, d0, i1, d1, i2, d2]
        : in1
          ? [i1, d1, i2, d2, i0, d0]
          : [i2, d2, i0, d0, i1, d1];
      emit(iIn);
      emitLerp(iIn, iA, edgeT(dIn, dA));
      emitLerp(iIn, iB, edgeT(dIn, dB));
    } else {
      const [iOut, dOut, iA, dA, iB, dB] = !in0
        ? [i0, d0, i1, d1, i2, d2]
        : !in1
          ? [i1, d1, i2, d2, i0, d0]
          : [i2, d2, i0, d0, i1, d1];
      const tA = edgeT(dOut, dA);
      const tB = edgeT(dOut, dB);
      emit(iA);
      emit(iB);
      emitLerp(iOut, iA, tA);
      emit(iB);
      emitLerp(iOut, iB, tB);
      emitLerp(iOut, iA, tA);
    }
  }

  const result = new THREE.BufferGeometry();
  attrs.forEach((a, name) => {
    const arr = out.get(name)!;
    if (arr.length > 0) result.setAttribute(name, new THREE.BufferAttribute(new Float32Array(arr), a.itemSize, a.normalized));
  });
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}

/**
 * Returns a deep clone of a normalized `scene` with everything past `xMin + lengthMm` along X
 * physically removed (the cut face is closed, not just hidden).
 */
export function clipAlongX(scene: THREE.Group, lengthMm: number): THREE.Group {
  const xMin = getVertexBounds(scene).min.x;
  const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -(xMin + lengthMm));
  const cloned = scene.clone(true);
  cloned.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.geometry = clipBufferGeometry(obj.geometry, plane);
  });
  return cloned;
}
