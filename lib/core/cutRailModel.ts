import * as THREE from "three";
import { clipAlongX, getVertexBounds, normalizeSceneGeometry, orientAndScaleBar } from "./geometry";

/**
 * Cuts a rail model to length, the way the saw cuts a piece off a raw bar.
 *
 * `railScene` is the rail GLB as loaded (`loadGlb`). It models one full raw bar. The returned
 * group is a new model of the piece, placed in the **rail frame** that every pose in
 * `placement.json` is expressed in:
 *
 *   - X runs along the rail; the piece spans X = 0 … cutLengthMm.
 *   - Y is across the rail; the rail's centreline is Y = 0.
 *   - Z points out of the mounting plate toward the operator; the face components clip onto
 *     is Z = 0, so the rail itself lies at Z ≤ 0.
 *
 * Units are millimetres.
 *
 * Throws when the piece cannot be cut: a length that is not a positive number, or one longer
 * than the raw bar it is cut from.
 */
export function cutRailModel(railScene: THREE.Object3D, cutLengthMm: number, barLengthMm: number): THREE.Group {
  if (!Number.isFinite(barLengthMm) || barLengthMm <= 0) {
    throw new Error(`cutRailModel: barLengthMm must be a positive number, got ${barLengthMm}`);
  }
  if (!Number.isFinite(cutLengthMm) || cutLengthMm <= 0) {
    throw new Error(`cutRailModel: cutLengthMm must be a positive number, got ${cutLengthMm}`);
  }
  if (cutLengthMm > barLengthMm) {
    throw new Error(`cutRailModel: a ${cutLengthMm} mm piece cannot be cut from a ${barLengthMm} mm bar`);
  }

  const bar = normalizeSceneGeometry(railScene.clone(true));
  orientAndScaleBar(bar, barLengthMm);
  faceClipSideForward(bar);

  const piece = clipAlongX(bar, cutLengthMm);
  const box = getVertexBounds(piece);
  const shift = new THREE.Matrix4().makeTranslation(-box.min.x, -(box.min.y + box.max.y) / 2, -box.max.z);
  piece.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry.applyMatrix4(shift);
    obj.geometry.computeBoundingBox();
    obj.geometry.computeBoundingSphere();
  });
  piece.name = `rail-piece-${cutLengthMm}mm`;
  piece.userData = { cutLengthMm, barLengthMm };
  return piece;
}

/**
 * A top-hat rail is screwed to the plate by its narrow crown and components clip onto its wide
 * flanges. This turns the bar so the flanges face +Z: it compares how wide the model is across Y
 * at its front and at its back, and flips it when the back is the wider.
 */
function faceClipSideForward(bar: THREE.Group): void {
  const box = getVertexBounds(bar);
  const tolerance = Math.max((box.max.z - box.min.z) * 0.05, 0.1);
  const front = { min: Infinity, max: -Infinity };
  const back = { min: Infinity, max: -Infinity };
  const p = new THREE.Vector3();
  bar.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const pos = obj.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      p.fromBufferAttribute(pos, i);
      const side = p.z >= box.max.z - tolerance ? front : p.z <= box.min.z + tolerance ? back : null;
      if (!side) continue;
      side.min = Math.min(side.min, p.y);
      side.max = Math.max(side.max, p.y);
    }
  });
  if (back.max - back.min <= front.max - front.min) return;
  const flip = new THREE.Matrix4().makeRotationX(Math.PI);
  bar.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry.applyMatrix4(flip);
  });
}
