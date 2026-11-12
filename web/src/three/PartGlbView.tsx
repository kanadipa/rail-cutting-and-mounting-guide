import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGlb } from "../../../lib/react";
import { Stage } from "./Stage";

/** A little turned towards the viewer, so the part reads as a solid and not as a flat outline. */
const START_ROTATION: [number, number, number] = [0.35, -0.6, 0];
const FILL = 0.8;
const BACKGROUND = "#f8f7f4";

/**
 * The part's own model, alone and centred, for looking at it from every side: drag to turn,
 * pinch to zoom. Only this small view turns; parts on the rail are never moved by a hand.
 */
export function PartGlbView({ glbUrl }: { glbUrl: string }) {
  return (
    <Stage touchAction="none" background={BACKGROUND}>
      <PartModel glbUrl={glbUrl} />
      <OrbitControls enablePan={false} enableDamping={false} />
    </Stage>
  );
}

function PartModel({ glbUrl }: { glbUrl: string }) {
  const { model } = useGlb(glbUrl);
  const { camera, size, invalidate } = useThree();

  // Centre the model on the origin and measure it, so the camera can fit any article.
  const fitted = useMemo(() => {
    if (!model) return null;
    const box = new THREE.Box3().setFromObject(model);
    const centre = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    model.position.sub(centre);
    return { model, diameter: Math.max(sphere.radius * 2, 1) };
  }, [model]);

  useEffect(() => {
    if (!fitted || !(camera instanceof THREE.OrthographicCamera)) return;
    camera.zoom = (Math.min(size.width, size.height) * FILL) / fitted.diameter;
    camera.position.set(0, 0, 1000);
    camera.updateProjectionMatrix();
    invalidate();
  }, [fitted, camera, size.width, size.height, invalidate]);

  return fitted ? (
    <group rotation={START_ROTATION}>
      <primitive object={fitted.model} />
    </group>
  ) : null;
}
