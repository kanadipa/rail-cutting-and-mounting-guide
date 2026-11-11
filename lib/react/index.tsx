/**
 * React Three Fiber wrappers over `lib/core`. They hold no logic of their own: each one calls the
 * matching core function, so anything here can be rebuilt in another framework from the core.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  addLights,
  cutRailModel,
  fitOrthographicCamera,
  loadGlb,
  placeComponent,
  type Pose,
} from "../core";

/** Loads a GLB. `model` is null until it arrives; `error` is set if it never will. */
export function useGlb(url: string): { model: THREE.Group | null; error: Error | null } {
  const [state, setState] = useState<{ url: string; model: THREE.Group | null; error: Error | null }>({
    url,
    model: null,
    error: null,
  });
  useEffect(() => {
    let live = true;
    loadGlb(url).then(
      (model) => live && setState({ url, model, error: null }),
      (error: Error) => live && setState({ url, model: null, error }),
    );
    return () => {
      live = false;
    };
  }, [url]);
  return state.url === url ? state : { model: null, error: null };
}

/**
 * The 3D viewport: orthographic camera facing the plate, lights, and orbit/pan/zoom by touch or
 * mouse. Units are millimetres. `fitKey` — change it to re-frame the camera on the content
 * (e.g. pass the current rail's BMK).
 */
export function RailCanvas({
  children,
  fitKey,
  background = "#f4f5f7",
}: {
  children: ReactNode;
  fitKey?: string | number;
  background?: string;
}) {
  return (
    <Canvas orthographic camera={{ position: [0, 0, 1000], near: -100_000, far: 100_000, zoom: 1 }} style={{ touchAction: "none" }}>
      <color attach="background" args={[background]} />
      <Lights />
      <FitOnChange fitKey={fitKey}>{children}</FitOnChange>
      <OrbitControls makeDefault enableDamping screenSpacePanning zoomToCursor />
    </Canvas>
  );
}

function Lights() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const group = new THREE.Group();
    addLights(group);
    scene.add(group);
    return () => void scene.remove(group);
  }, [scene]);
  return null;
}

function FitOnChange({ children, fitKey }: { children: ReactNode; fitKey?: string | number }) {
  const ref = useRef<THREE.Group>(null);
  const { camera, size, controls } = useThree();
  useEffect(() => {
    // Models arrive asynchronously; fit once now and again shortly after they have loaded.
    const fit = () => {
      if (ref.current && camera instanceof THREE.OrthographicCamera) {
        fitOrthographicCamera(camera, controls as unknown as { target: THREE.Vector3; update(): void } | null, ref.current, size.width, size.height);
      }
    };
    fit();
    const timer = setTimeout(fit, 400);
    return () => clearTimeout(timer);
  }, [fitKey, camera, controls, size.width, size.height]);
  return <group ref={ref}>{children}</group>;
}

/** A rail piece cut to `cutLengthMm` from its raw bar. Throws (to the nearest error boundary) if it cannot be cut. */
export function RailModel({
  url,
  cutLengthMm,
  barLengthMm,
}: {
  url: string;
  cutLengthMm: number;
  barLengthMm: number;
}) {
  const { model, error } = useGlb(url);
  if (error) throw error;
  const piece = useMemo(() => (model ? cutRailModel(model, cutLengthMm, barLengthMm) : null), [model, cutLengthMm, barLengthMm]);
  return piece ? <primitive object={piece} /> : null;
}

/** A component at its pose in the rail frame. */
export function ComponentModel({
  url,
  pose,
  onClick,
}: {
  url: string;
  pose: Pose;
  onClick?: () => void;
}) {
  const { model, error } = useGlb(url);
  if (error) throw error;
  useEffect(() => {
    if (model) placeComponent(model, pose);
  }, [model, pose]);
  if (!model) return null;
  return (
    <primitive
      object={model}
      onClick={
        onClick &&
        ((e: { stopPropagation(): void }) => {
          e.stopPropagation();
          onClick();
        })
      }
    />
  );
}
