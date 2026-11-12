/**
 * Temporary dev page: replays a rail in the computed mounting order, like the demo's slider but
 * in `mountSeq` order, with the part added last tinted. Data: order.json, exported from the
 * database by `npm run dev:order -w server`.
 */
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { RailCanvas, RailModel, useGlb } from "../../lib/react";
import { placeComponent, type Pose } from "../../lib/core";
import order from "./order.json";

interface ReplayItem {
  mountSeq: number;
  bmk: string;
  category: string;
  displayName: string;
  xStartMm: number;
  gapBeforeMm: number;
  mountsOn: string | null;
  glb: string;
  pose: Pose;
}
interface ReplayRail {
  bmk: string;
  cutLengthMm: number;
  barLengthMm: number;
  glb: string;
  items: ReplayItem[];
}

const rails = order as unknown as ReplayRail[];

function Part({ item, current }: { item: ReplayItem; current: boolean }) {
  const { model } = useGlb(item.glb);
  useEffect(() => {
    if (!model) return;
    placeComponent(model, item.pose);
    model.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const material = obj.material as THREE.MeshStandardMaterial;
      material.emissive?.set(current ? "#C8471F" : "#000000");
      material.emissiveIntensity = current ? 0.6 : 0;
    });
  }, [model, item.pose, current]);
  return model ? <primitive object={model} /> : null;
}

function Replay() {
  const [railBmk, setRailBmk] = useState(rails[0].bmk);
  const [shown, setShown] = useState(1);
  const rail = rails.find((r) => r.bmk === railBmk)!;
  const last = rail.items[shown - 1];
  const step = (delta: number) => setShown((n) => Math.min(rail.items.length, Math.max(0, n + delta)));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", fontSize: 18 }}>
        <select
          value={railBmk}
          style={{ fontSize: 18 }}
          onChange={(e) => {
            setRailBmk(e.target.value);
            setShown(1);
          }}
        >
          {rails.map((r) => (
            <option key={r.bmk} value={r.bmk}>
              {r.bmk} — cut {r.cutLengthMm} mm, {r.items.length} parts
            </option>
          ))}
        </select>
        <button style={{ fontSize: 18, padding: "8px 20px" }} onClick={() => step(-1)}>◀ Back</button>
        <input type="range" min={0} max={rail.items.length} value={shown} style={{ width: 360 }} onChange={(e) => setShown(Number(e.target.value))} />
        <button style={{ fontSize: 18, padding: "8px 20px" }} onClick={() => step(1)}>Next ▶</button>
        <span style={{ fontFamily: "ui-monospace, monospace" }}>
          {shown}/{rail.items.length}
          {last &&
            ` · ${last.bmk} · ${last.category} · x ${last.xStartMm.toFixed(1)} mm · gap ${last.gapBeforeMm.toFixed(1)} mm` +
              (last.mountsOn ? ` · clips onto ${last.mountsOn}` : "")}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <RailCanvas fitKey={railBmk}>
          <RailModel url={rail.glb} cutLengthMm={rail.cutLengthMm} barLengthMm={rail.barLengthMm} />
          {rail.items.slice(0, shown).map((item) => (
            <Part key={item.bmk} item={item} current={item.mountSeq === shown} />
          ))}
        </RailCanvas>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Replay />
  </StrictMode>,
);
