import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { placeComponent, type Pose } from "../../../lib/core/placeComponent";
import type { Box } from "../../src/domain/box";

/**
 * Measures parts the way the screen shows them: the article's GLB, placed with the lib's own
 * `placeComponent`, then its bounding box in the rail frame. The pose alone is not enough,
 * because every article's model has its origin somewhere else.
 */
export class PartMeasurer {
  private readonly models = new Map<string, Promise<THREE.Object3D>>();
  /** A part's box with its origin at 0, per article and orientation: every copy reuses it. */
  private readonly boxes = new Map<string, Promise<Box>>();

  /** `projectRoot` is the folder the catalog's `glb` paths are relative to. */
  constructor(private readonly projectRoot: string) {}

  async boxAt(glbPath: string, pose: Pose): Promise<Box> {
    // A pose is a turn about the model's origin, then a move. So the box of a given article and
    // orientation is measured once at the origin, and each copy only shifts it by its position.
    const key = `${glbPath}|${pose.quaternion.join(",")}`;
    let pending = this.boxes.get(key);
    if (!pending) {
      pending = this.measureAtOrigin(glbPath, pose.quaternion);
      this.boxes.set(key, pending);
    }
    const box = await pending;
    const [dx, dy, dz] = pose.positionMm;
    return {
      min: { x: box.min.x + dx, y: box.min.y + dy, z: box.min.z + dz },
      max: { x: box.max.x + dx, y: box.max.y + dy, z: box.max.z + dz },
    };
  }

  private async measureAtOrigin(glbPath: string, quaternion: Pose["quaternion"]): Promise<Box> {
    const model = (await this.load(glbPath)).clone(true);
    placeComponent(model, { positionMm: [0, 0, 0], quaternion });
    model.updateMatrixWorld(true);
    // Precise: from the vertices, so a rotated part is not measured by its rotated box.
    const box = new THREE.Box3().setFromObject(model, true);
    if (box.isEmpty()) throw new Error(`${glbPath}: the model has no geometry to measure`);
    return { min: { x: box.min.x, y: box.min.y, z: box.min.z }, max: { x: box.max.x, y: box.max.y, z: box.max.z } };
  }

  /** Each article's file is read and parsed once; every part gets its own clone. */
  private load(glbPath: string): Promise<THREE.Object3D> {
    let pending = this.models.get(glbPath);
    if (!pending) {
      pending = parseGlb(path.join(this.projectRoot, glbPath));
      this.models.set(glbPath, pending);
    }
    return pending;
  }
}

async function parseGlb(file: string): Promise<THREE.Object3D> {
  let bytes: Buffer;
  try {
    bytes = await fs.promises.readFile(file);
  } catch {
    throw new Error(`3D model not found: ${file}`);
  }
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(
      data,
      "",
      (gltf) => resolve(gltf.scene),
      (error) => reject(new Error(`3D model cannot be read: ${file}: ${error.message}`)),
    );
  });
}
