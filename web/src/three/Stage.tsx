import { Canvas, useThree } from "@react-three/fiber";
import { type ReactNode, useEffect } from "react";
import * as THREE from "three";
import { addLights } from "../../../lib/core";

const BACKGROUND = "#e7e2d8";

/**
 * The 3D viewport of the operator screens: an orthographic camera looking at the mounting plate,
 * the lib's lights, and no controls of its own: views are fixed unless a screen adds controls. It draws only when something
 * changed, and at most at twice the CSS resolution, to keep a bench tablet cool.
 */
export function Stage({ children, touchAction = "pan-y", background = BACKGROUND }: { children: ReactNode; touchAction?: "pan-y" | "none"; background?: string }) {
  return (
    <Canvas
      orthographic
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 1000], near: -100_000, far: 100_000, zoom: 1 }}
      style={{ touchAction }}
    >
      <color attach="background" args={[background]} />
      <Lights />
      {children}
    </Canvas>
  );
}

function Lights() {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const lights = new THREE.Group();
    addLights(lights);
    scene.add(lights);
    return () => void scene.remove(lights);
  }, [scene]);
  return null;
}
