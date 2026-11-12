import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { cutRailModel, fitOrthographicCamera } from "../../../lib/core";
import { useGlb } from "../../../lib/react";
import type { Bar } from "../api/types";
import { Stage } from "./Stage";
import styles from "./BarCutView.module.css";

/** Tilted towards the viewer so the bar reads as a top-hat rail, not as a flat strip. */
const VIEW_TILT: [number, number, number] = [0.55, 0.3, 0];
const PADDING = 1.08;
/** A piece already cut lies this far below the bar, as it would on the bench. */
const ASIDE_Y_MM = -55;
/** How much bar is in view past the cut, so the saw line is never at the edge of the picture. */
const AFTER_CUT_MM = 160;
const BEFORE_MM = 30;

const CUT_COLOUR = "#d83b01";
const DONE_COLOUR = "#9ea2ab";

interface BarCutViewProps {
  glbUrl: string;
  bar: Bar;
  /** The piece to cut now; null once the bar is used up. */
  currentRailId: number | null;
  cutRailIds: Set<number>;
  /** Frame the whole raw bar instead of the stretch around the current piece. */
  wholeBar?: boolean;
  labels: { cutAt: (at: number) => string; mm: (value: number) => string };
}

/**
 * The raw bar as it lies on the saw: pieces already cut set aside and greyed, the piece to cut now
 * in vermilion with a red saw line where the cut goes, and the rest of the bar plain.
 * Every segment is the lib's own cut of the bar model. Fixed view: nothing moves under a hand.
 */
export function BarCutView(props: BarCutViewProps) {
  return (
    <Stage>
      <BarModel {...props} />
    </Stage>
  );
}

interface Segment {
  key: string;
  bmk: string | null;
  offsetMm: number;
  lengthMm: number;
  state: "cut" | "now" | "todo" | "rest";
  model: THREE.Group;
}

function BarModel({ glbUrl, bar, currentRailId, cutRailIds, wholeBar = false, labels }: BarCutViewProps) {
  const { model } = useGlb(glbUrl);
  const segments = useMemo<Segment[]>(() => {
    if (!model) return [];
    const cut = (length: number) => {
      try {
        return cutRailModel(model, length, bar.barLengthMm);
      } catch {
        return null; // The import refuses impossible cuts; the numbers still guide the operator.
      }
    };
    const list: Segment[] = [];
    for (const piece of bar.pieces) {
      const segment = cut(piece.lengthMm);
      if (!segment) continue;
      const state = piece.railId === currentRailId ? "now" : cutRailIds.has(piece.railId) ? "cut" : "todo";
      list.push({ key: `p${piece.railId}`, bmk: piece.bmk, offsetMm: piece.offsetMm, lengthMm: piece.lengthMm, state, model: tint(segment, state) });
    }
    const rest = bar.remnantMm > 0.5 ? cut(bar.remnantMm) : null;
    if (rest) list.push({ key: "rest", bmk: null, offsetMm: bar.usedMm, lengthMm: bar.remnantMm, state: "rest", model: rest });
    return list;
  }, [model, bar, currentRailId, cutRailIds]);

  const current = bar.pieces.find((piece) => piece.railId === currentRailId) ?? null;
  const cutEnd = current ? current.offsetMm + current.lengthMm : null;
  // The start of the current piece still needs a cut when the piece before it is not off the bar yet.
  const previous = current ? bar.pieces.find((piece) => piece.offsetMm + piece.lengthMm === current.offsetMm) : undefined;
  const cutStart = current && current.offsetMm > 0 && previous && !cutRailIds.has(previous.railId) ? current.offsetMm : null;

  // The framing window: around the piece to cut, or the whole bar.
  const aroundPiece = current !== null && !wholeBar;
  const windowFrom = (aroundPiece ? Math.max(0, current.offsetMm - 120) : 0) - BEFORE_MM;
  const windowTo = aroundPiece && cutEnd !== null ? Math.min(bar.barLengthMm, cutEnd + AFTER_CUT_MM) + BEFORE_MM : bar.barLengthMm + BEFORE_MM;

  const group = useRef<THREE.Group>(null);
  const frame = useRef<THREE.Mesh>(null);
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (!frame.current || !(camera instanceof THREE.OrthographicCamera)) return;
    fitOrthographicCamera(camera, null, frame.current, size.width, size.height, PADDING);
    invalidate();
  }, [segments, windowFrom, windowTo, camera, size.width, size.height, invalidate]);

  return (
    <group ref={group} rotation={VIEW_TILT}>
      {/* Invisible box the camera frames. */}
      <mesh ref={frame} visible={false} position={[(windowFrom + windowTo) / 2, ASIDE_Y_MM / 2, -8]}>
        <boxGeometry args={[windowTo - windowFrom, 70 - ASIDE_Y_MM, 16]} />
      </mesh>
      {segments.map((segment) => (
        <group key={segment.key} position={[segment.offsetMm, segment.state === "cut" ? ASIDE_Y_MM : 0, 0]}>
          <primitive object={segment.model} />
          {segment.bmk && (
            <Html position={[segment.lengthMm / 2, 24, 0]} center zIndexRange={[5, 0]}>
              <span className={`${styles.tag} ${styles[segment.state]}`}>
                {segment.bmk} · {labels.mm(segment.lengthMm)}
              </span>
            </Html>
          )}
        </group>
      ))}
      {cutEnd !== null && <SawLine x={cutEnd} label={labels.cutAt(cutEnd - (current?.offsetMm ?? 0))} />}
      {cutStart !== null && <SawLine x={cutStart} label={null} />}
    </group>
  );
}

/** A red plane through the bar, where the saw goes. */
function SawLine({ x, label }: { x: number; label: string | null }) {
  return (
    <group position={[x, 0, -7]}>
      <mesh>
        <boxGeometry args={[1.6, 64, 30]} />
        <meshBasicMaterial color={CUT_COLOUR} transparent opacity={0.85} />
      </mesh>
      {label && (
        <Html position={[0, -40, 0]} center zIndexRange={[6, 0]}>
          <span className={styles.saw}>✂ {label}</span>
        </Html>
      )}
    </group>
  );
}

/** Colours a segment for its state. Materials are cloned so segments never share a colour. */
function tint(segment: THREE.Group, state: Segment["state"]): THREE.Group {
  if (state === "todo") return segment;
  segment.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = (Array.isArray(object.material) ? object.material : [object.material]).map((material: THREE.Material) => {
      const copy = material.clone();
      if (copy instanceof THREE.MeshStandardMaterial) {
        if (state === "now") {
          copy.emissive.set(CUT_COLOUR);
          copy.emissiveIntensity = 0.45;
        } else {
          copy.color.set(DONE_COLOUR);
          copy.transparent = true;
          copy.opacity = 0.55;
        }
      }
      return copy;
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
  });
  return segment;
}
