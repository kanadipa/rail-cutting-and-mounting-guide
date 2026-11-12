export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** An axis-aligned bounding box in the rail frame: X along the rail, Z away from the plate. Millimetres. */
export interface Box {
  min: Vec3;
  max: Vec3;
}
