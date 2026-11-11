import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { cutRailModel } from "../lib/core/cutRailModel";
import { getVertexBounds } from "../lib/core/geometry";

/**
 * A stand-in for a TS35 rail GLB: two 1 mm flanges 35 mm across at the front (z = 0…1), a
 * 27 mm crown at the back (z = -7.5…-6.5), modelled along `lengthAxis` in `unitScale` units.
 */
function hatBar(lengthMm: number, { unitScale = 1, lengthAxis = "x" as "x" | "y" | "z", upsideDown = false } = {}) {
  const group = new THREE.Group();
  const box = (w: number, h: number, d: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(lengthMm, w, d), new THREE.MeshStandardMaterial());
    mesh.position.set(lengthMm / 2, y, upsideDown ? -z : z);
    group.add(mesh);
  };
  box(4, 1, 1, 15.5, 0.5); // flange, top
  box(4, 1, 1, -15.5, 0.5); // flange, bottom
  box(27, 1, 1, 0, -7); // crown
  box(1, 7.5, 1, 13, -3.25); // web, top
  box(1, 7.5, 1, -13, -3.25); // web, bottom
  const root = new THREE.Group();
  root.add(group);
  root.scale.setScalar(unitScale);
  if (lengthAxis === "y") root.rotation.z = Math.PI / 2;
  if (lengthAxis === "z") root.rotation.y = -Math.PI / 2;
  return root;
}

/** How wide the model is across Y within 0.5 mm of the given Z. */
function widthAtZ(model: THREE.Object3D, z: number): number {
  let min = Infinity;
  let max = -Infinity;
  const p = new THREE.Vector3();
  model.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const pos = obj.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      p.fromBufferAttribute(pos, i);
      if (Math.abs(p.z - z) > 0.5) continue;
      min = Math.min(min, p.y);
      max = Math.max(max, p.y);
    }
  });
  return max - min;
}

const expectWithin = (actual: number, expected: number, toleranceMm: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(toleranceMm);

describe("cutRailModel", () => {
  it("cuts the piece to length and puts it in the rail frame", () => {
    const piece = cutRailModel(hatBar(2000), 437, 2000);
    const box = getVertexBounds(piece);
    expect(box.min.x).toBeCloseTo(0, 3);
    expectWithin(box.max.x - box.min.x, 437, 0.5);
    expect((box.min.y + box.max.y) / 2).toBeCloseTo(0, 3);
    expect(box.max.z).toBeCloseTo(0, 3);
  });

  it("brings a bar modelled in metres, along another axis, to millimetres along X", () => {
    const piece = cutRailModel(hatBar(2000, { unitScale: 0.001, lengthAxis: "z" }), 500, 2000);
    const size = getVertexBounds(piece).getSize(new THREE.Vector3());
    expectWithin(size.x, 500, 0.5);
  });

  it("turns the clip-on flanges toward +Z even when the GLB has them at the back", () => {
    const piece = cutRailModel(hatBar(2000, { upsideDown: true }), 300, 2000);
    expectWithin(widthAtZ(piece, 0), 35, 0.5);
  });

  it("keeps the original model untouched", () => {
    const bar = hatBar(2000);
    cutRailModel(bar, 100, 2000);
    bar.updateMatrixWorld(true);
    expect(new THREE.Box3().setFromObject(bar).getSize(new THREE.Vector3()).x).toBeCloseTo(2000, 3);
  });

  it("refuses a piece longer than the bar", () => {
    expect(() => cutRailModel(hatBar(2000), 2000.5, 2000)).toThrow(/cannot be cut from a 2000 mm bar/);
  });

  it("allows a piece exactly as long as the bar", () => {
    expect(getVertexBounds(cutRailModel(hatBar(2000), 2000, 2000)).getSize(new THREE.Vector3()).x).toBeCloseTo(2000, 3);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])("refuses a cut length of %s", (len) => {
    expect(() => cutRailModel(hatBar(2000), len, 2000)).toThrow(/cutLengthMm must be a positive number/);
  });

  it.each([0, -1, Number.NaN])("refuses a bar length of %s", (len) => {
    expect(() => cutRailModel(hatBar(2000), 100, len)).toThrow(/barLengthMm must be a positive number/);
  });
});
