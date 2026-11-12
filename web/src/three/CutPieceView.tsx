import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { cutRailModel, fitOrthographicCamera } from "../../../lib/core";
import { useGlb } from "../../../lib/react";
import { Stage } from "./Stage";

/** Tilted towards the viewer so the piece reads as a top-hat rail, not as a flat strip. */
const VIEW_TILT: [number, number, number] = [0.6, 0.35, 0];
const PADDING = 1.12;

interface CutPieceProps {
  glbUrl: string;
  cutLengthMm: number;
  barLengthMm: number;
}

/** The piece as it comes off the saw: the raw bar's model cut to length by the lib. Fixed view. */
export function CutPieceView(props: CutPieceProps) {
  return (
    <Stage>
      <CutPiece {...props} />
    </Stage>
  );
}

function CutPiece({ glbUrl, cutLengthMm, barLengthMm }: CutPieceProps) {
  const { model } = useGlb(glbUrl);
  const piece = useMemo(() => {
    if (!model) return null;
    try {
      return cutRailModel(model, cutLengthMm, barLengthMm);
    } catch {
      // The import refuses impossible cuts; if one slips through, the numbers still guide the cut.
      return null;
    }
  }, [model, cutLengthMm, barLengthMm]);

  const group = useRef<THREE.Group>(null);
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (!piece || !group.current || !(camera instanceof THREE.OrthographicCamera)) return;
    fitOrthographicCamera(camera, null, group.current, size.width, size.height, PADDING);
    invalidate();
  }, [piece, camera, size.width, size.height, invalidate]);

  return <group ref={group} rotation={VIEW_TILT}>{piece && <primitive object={piece} />}</group>;
}
