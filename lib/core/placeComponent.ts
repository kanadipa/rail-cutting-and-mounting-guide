import * as THREE from "three";

/** Where a component sits in the rail frame (see `cutRailModel`). Millimetres. */
export interface Pose {
  /** [x, y, z] of the model's origin in the rail frame. */
  positionMm: [number, number, number];
  /** Orientation as a unit quaternion [x, y, z, w]. */
  quaternion: [number, number, number, number];
}

/**
 * Applies `pose` to `model` and returns it. The component GLBs are prepared so that this
 * transform alone puts each one where it belongs on its rail — no extra scaling or centring.
 */
export function placeComponent<T extends THREE.Object3D>(model: T, pose: Pose): T {
  const [x, y, z] = pose.positionMm;
  const [qx, qy, qz, qw] = pose.quaternion;
  model.position.set(x, y, z);
  model.quaternion.set(qx, qy, qz, qw).normalize();
  model.scale.set(1, 1, 1);
  model.updateMatrix();
  return model;
}
