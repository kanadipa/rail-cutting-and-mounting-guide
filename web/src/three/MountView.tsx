import { Html, Line, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { cutRailModel, loadGlb, placeComponent } from "../../../lib/core";
import { useGlb } from "../../../lib/react";
import type { Part, Rail } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { clipTargetBmk, distanceFromLeftMm } from "../screens/whereLine";
import { Stage } from "./Stage";
import styles from "./MountView.module.css";

const VERMILION = "#d83b01";
const TEAL = "#0f6e78";
const AMBER = "#b7791f";
const NAVY = "#0c3866";
/** Zoom steps of the + / − buttons: each is a quarter more or less, within these limits. */
export const ZOOM_STEP_FACTOR = 1.25;
export const ZOOM_STEP_MIN = -3;
export const ZOOM_STEP_MAX = 5;
/** The dimension line runs below the rail, clear of the parts. */
const DIMENSION_Y_MM = -38;
/** How many of the coming parts have their models fetched ahead of time. */
const PRELOAD_AHEAD = 3;
/** The close-up shows this much rail around the current part; parts are up to 130 mm tall. */
const CLOSE_UP_WIDTH_MM = 190;
const VIEW_HEIGHT_MM = 160;
const WHOLE_RAIL_MARGIN_MM = 12;
const VIEW_CENTRE_Y_MM = 5;

interface MountViewProps {
  rail: Rail;
  /** The part to mount now; null once the rail is complete. */
  current: Part | null;
  wholeRail: boolean;
  /** The operator turned rotation on: drag to rotate, two fingers to pan, pinch to zoom. */
  free: boolean;
  /** Whole steps from the framed view; the + / − buttons change it. */
  zoomStep: number;
  /** A pinch or the mouse wheel zoomed the view: the new distance from the framed view, in steps. */
  onZoomChange: (step: number) => void;
}

/**
 * The rail as it should look after this step: the parts already mounted, plus the current part
 * highlighted. Parts still to come are not shown, so the highlighted one is always the last on.
 * Front view, as the operator faces the rail. It stays fixed, so a hand brushing the screen
 * changes nothing, until rotation is turned on; turning it off returns to the front view.
 */
export function MountView({ rail, current, wholeRail, free, zoomStep, onZoomChange }: MountViewProps) {
  const mounted = rail.parts.slice(0, current ? current.mountSeq - 1 : rail.parts.length);
  // A part that clips onto another part: that one is outlined in teal, so the operator sees where it goes.
  const targetBmk = current ? clipTargetBmk(current.where) : null;

  useEffect(() => {
    if (!current) return;
    for (const part of rail.parts.slice(current.mountSeq, current.mountSeq + PRELOAD_AHEAD)) {
      // A model that cannot be fetched must not hold up the step; photo and text still guide it.
      loadGlb(part.glbUrl).catch(() => undefined);
    }
  }, [rail.parts, current]);

  return (
    // Two fingers (or the wheel) always zoom; one finger turns only in turn mode. The canvas takes
    // all touches so a pinch is not taken by the browser's page zoom.
    <Stage touchAction="none">
      <RailPiece rail={rail} />
      {mounted.map((part) => (
        <PartModel key={part.id} part={part} tone={part.bmk === targetBmk ? "target" : "plain"} />
      ))}
      {current && <PartModel key={current.id} part={current} tone="current" />}
      {current && !wholeRail && <Placement rail={rail} part={current} />}
      <Framing rail={rail} current={current} wholeRail={wholeRail} free={free} zoomStep={zoomStep} onZoomChange={onZoomChange} />
    </Stage>
  );
}

function RailPiece({ rail }: { rail: Rail }) {
  const { model } = useGlb(rail.glbUrl);
  const invalidate = useThree((state) => state.invalidate);
  const piece = useMemo(() => {
    if (!model) return null;
    try {
      return cutRailModel(model, rail.cutLengthMm, rail.barLengthMm);
    } catch {
      return null;
    }
  }, [model, rail.cutLengthMm, rail.barLengthMm]);
  useEffect(() => invalidate(), [piece, invalidate]);
  return piece ? <primitive object={piece} /> : null;
}

type Tone = "current" | "target" | "plain";
const TONES: Record<Tone, { colour: string; strength: number }> = {
  current: { colour: VERMILION, strength: 0.55 },
  target: { colour: TEAL, strength: 0.6 },
  plain: { colour: "#000000", strength: 0 },
};

function PartModel({ part, tone }: { part: Part; tone: Tone }) {
  // On a failed load `model` stays null and the part is simply not drawn.
  const { model } = useGlb(part.glbUrl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!model) return;
    placeComponent(model, part.pose);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        material.emissive.set(TONES[tone].colour);
        material.emissiveIntensity = TONES[tone].strength;
      }
    });
    invalidate();
  }, [model, part.pose, tone, invalidate]);

  return model ? <primitive object={model} /> : null;
}

/** Points the camera at the current part and its neighbours, or at the whole rail; and zooms it. */
function Framing({ rail, current, wholeRail, free, zoomStep, onZoomChange }: MountViewProps) {
  const { camera, size, invalidate } = useThree();
  const controls = useThree((state) => state.controls) as unknown as OrbitControlsImpl | null;
  const framedZoom = useRef(1);
  const zoomStepRef = useRef(zoomStep);
  zoomStepRef.current = zoomStep;
  const closeUp = current !== null && !wholeRail;
  const centreX = closeUp ? (current.xStartMm + current.xEndMm) / 2 : rail.cutLengthMm / 2;
  const widthMm = closeUp ? CLOSE_UP_WIDTH_MM : rail.cutLengthMm + 2 * WHOLE_RAIL_MARGIN_MM;

  // Runs again when rotation is switched, so both ways start from the framed front view.
  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    framedZoom.current = Math.min(size.width / widthMm, size.height / VIEW_HEIGHT_MM);
    camera.position.set(centreX, VIEW_CENTRE_Y_MM, 1000);
    camera.rotation.set(0, 0, 0);
    camera.zoom = framedZoom.current * ZOOM_STEP_FACTOR ** zoomStepRef.current;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(centreX, VIEW_CENTRE_Y_MM, 0);
      controls.minZoom = framedZoom.current * ZOOM_STEP_FACTOR ** ZOOM_STEP_MIN;
      controls.maxZoom = framedZoom.current * ZOOM_STEP_FACTOR ** ZOOM_STEP_MAX;
      controls.update();
    }
    invalidate();
  }, [camera, controls, size.width, size.height, centreX, widthMm, free, invalidate]);

  // The + / − buttons and a pinch change the zoom only: a turned view keeps its angle.
  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    camera.zoom = framedZoom.current * ZOOM_STEP_FACTOR ** zoomStep;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, zoomStep, invalidate]);

  return (
    <OrbitControls
      makeDefault
      target={[centreX, VIEW_CENTRE_Y_MM, 0]}
      enableDamping={false}
      enableRotate={free}
      enablePan={free}
      screenSpacePanning
      zoomToCursor={free}
      onEnd={() => {
        if (camera instanceof THREE.OrthographicCamera) onZoomChange(Math.log(camera.zoom / framedZoom.current) / Math.log(ZOOM_STEP_FACTOR));
      }}
    />
  );
}

/**
 * Where the part goes, drawn on the rail: a dimension line from the part's left edge towards the
 * rail's left end, and for a part after empty rail, the free stretch shaded amber. The line's far
 * end may be out of view in the close-up; the label stays by the part.
 */
function Placement({ rail, part }: { rail: Rail; part: Part }) {
  const { t, mm } = useI18n();
  const fromLeft = distanceFromLeftMm(part.where);
  const x = part.xStartMm;
  const previous = rail.parts[part.mountSeq - 2];
  const free = part.where.kind === "AFTER_GAP" ? part.where.gapMm : null;
  const freeFrom = free === null ? 0 : previous ? previous.xEndMm : x - free;
  const y = DIMENSION_Y_MM;

  return (
    <group position={[0, 0, 40]}>
      {fromLeft !== null && (
        <>
          <Line points={[[x, y, 0], [0, y, 0]]} color={NAVY} lineWidth={2} />
          <Line points={[[x, y - 7, 0], [x, y + 7, 0]]} color={NAVY} lineWidth={2} />
          <Line points={[[0, y - 7, 0], [0, y + 7, 0]]} color={NAVY} lineWidth={2} />
          <Line points={[[6, y + 4, 0], [0, y, 0], [6, y - 4, 0]]} color={NAVY} lineWidth={2} />
          <Html position={[x, y - 12, 0]} zIndexRange={[5, 0]}>
            <span className={styles.dimension}>{t.mount.fromLeft(mm(fromLeft))}</span>
          </Html>
        </>
      )}
      {free !== null && (
        <>
          <mesh position={[(freeFrom + x) / 2, 5, -30]}>
            <boxGeometry args={[Math.max(x - freeFrom, 0.1), 90, 1]} />
            <meshBasicMaterial color={AMBER} transparent opacity={0.32} depthWrite={false} />
          </mesh>
          <Html position={[(freeFrom + x) / 2, 62, 0]} center zIndexRange={[5, 0]}>
            <span className={styles.free}>{t.mount.free(mm(free))}</span>
          </Html>
        </>
      )}
    </group>
  );
}
