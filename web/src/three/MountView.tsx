import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { cutRailModel, loadGlb, placeComponent } from "../../../lib/core";
import { useGlb } from "../../../lib/react";
import type { Part, Rail } from "../api/types";
import { Stage } from "./Stage";

const HIGHLIGHT = "#c8471f";
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
}

/**
 * The rail as it should look after this step: the parts already mounted, plus the current part
 * highlighted. Parts still to come are not shown, so the highlighted one is always the last on.
 * Front view, as the operator faces the rail. It stays fixed, so a hand brushing the screen
 * changes nothing, until rotation is turned on; turning it off returns to the front view.
 */
export function MountView({ rail, current, wholeRail, free }: MountViewProps) {
  const mounted = rail.parts.slice(0, current ? current.mountSeq - 1 : rail.parts.length);

  useEffect(() => {
    if (!current) return;
    for (const part of rail.parts.slice(current.mountSeq, current.mountSeq + PRELOAD_AHEAD)) {
      // A model that cannot be fetched must not hold up the step; photo and text still guide it.
      loadGlb(part.glbUrl).catch(() => undefined);
    }
  }, [rail.parts, current]);

  return (
    <Stage touchAction={free ? "none" : "pan-y"}>
      <RailPiece rail={rail} />
      {mounted.map((part) => (
        <PartModel key={part.id} part={part} highlighted={false} />
      ))}
      {current && <PartModel key={current.id} part={current} highlighted />}
      <Framing rail={rail} current={current} wholeRail={wholeRail} free={free} />
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

function PartModel({ part, highlighted }: { part: Part; highlighted: boolean }) {
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
        material.emissive.set(highlighted ? HIGHLIGHT : "#000000");
        material.emissiveIntensity = highlighted ? 0.55 : 0;
      }
    });
    invalidate();
  }, [model, part.pose, highlighted, invalidate]);

  return model ? <primitive object={model} /> : null;
}

/** Points the camera at the current part and its neighbours, or at the whole rail. */
function Framing({ rail, current, wholeRail, free }: MountViewProps) {
  const { camera, size, invalidate } = useThree();
  const closeUp = current !== null && !wholeRail;
  const centreX = closeUp ? (current.xStartMm + current.xEndMm) / 2 : rail.cutLengthMm / 2;
  const widthMm = closeUp ? CLOSE_UP_WIDTH_MM : rail.cutLengthMm + 2 * WHOLE_RAIL_MARGIN_MM;

  // Runs again when rotation is switched, so both ways start from the framed front view.
  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    camera.position.set(centreX, VIEW_CENTRE_Y_MM, 1000);
    camera.rotation.set(0, 0, 0);
    camera.zoom = Math.min(size.width / widthMm, size.height / VIEW_HEIGHT_MM);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, centreX, widthMm, free, invalidate]);

  return free ? <OrbitControls target={[centreX, VIEW_CENTRE_Y_MM, 0]} enableDamping={false} screenSpacePanning zoomToCursor /> : null;
}
