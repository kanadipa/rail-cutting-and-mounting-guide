/**
 * A minimal reference for using the lib with the data and the assets. It is NOT a design
 * reference: building the operator screen is your job.
 *
 * Shows one rail cut to length with its components at their poses. The slider sets how many of
 * the rail's `placedItems` are on it, adding them in the order they are listed (by BMK, which is
 * NOT the mounting order — working that out is part of the challenge).
 */
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ComponentModel, RailCanvas, RailModel } from "../lib/react";
import type { Pose } from "../lib/core";

// ── The shape of the two data files (see docs/data-model.md) ─────────────────────────────────────
// Only the fields this demo uses are typed here.

/** A component on a rail, from `placedItems` in placement.json. */
interface PlacedItem {
  bmk: string;
  manufacturer: string;
  articleNumber: string;
  /** Where its GLB goes, relative to its rail. Apply it as it is; nothing else is needed. */
  pose: Pose;
}
/** A rail to cut and assemble, from placement.json. */
interface Rail {
  bmk: string;
  manufacturer: string;
  articleNumber: string;
  cutLengthMm: number;
  /** Sorted by BMK, not in mounting order. */
  placedItems: PlacedItem[];
}
/** One article, from catalog.json. Rails and components are both articles. */
interface CatalogEntry {
  manufacturer: string;
  articleNumber: string;
  displayName: string;
  /** Path of the 3D model, relative to the project folder (the one with package.json). */
  glb: string;
  /** Rail profiles only: the length of one raw bar. */
  barLengthMm?: number;
}

/** Fetches a JSON file, failing loudly on a missing one rather than rendering nothing. */
const getJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
};

function Demo() {
  const [data, setData] = useState<{ rails: Rail[]; catalog: CatalogEntry[] } | null>(null);
  /** The rail on screen, by its BMK. */
  const [railBmk, setRailBmk] = useState<string | null>(null);
  /** How many of the rail's placedItems are shown, from the start of the list. */
  const [shown, setShown] = useState(0);

  // Vite serves the project folder, so data/ and assets/ are reachable as /data/… and /assets/….
  // Start on the first rail with all of its parts on it.
  useEffect(() => {
    Promise.all([getJson<Rail[]>("/data/placement.json"), getJson<CatalogEntry[]>("/data/catalog.json")]).then(([rails, catalog]) => {
      setData({ rails, catalog });
      setRailBmk(rails[0]?.bmk ?? null);
      setShown(rails[0]?.placedItems.length ?? 0);
    });
  }, []);

  if (!data || !railBmk) return <p style={{ padding: 16 }}>Loading…</p>;
  const rail = data.rails.find((r) => r.bmk === railBmk)!;

  // An article is named by its manufacturer and article number together: two manufacturers can use
  // the same number, so neither field alone finds the right catalog entry.
  const articleOf = (a: { manufacturer: string; articleNumber: string }) => {
    const entry = data.catalog.find((c) => c.manufacturer === a.manufacturer && c.articleNumber === a.articleNumber);
    if (!entry) throw new Error(`${a.manufacturer} ${a.articleNumber} is not in catalog.json`);
    return entry;
  };
  const glbOf = (a: { manufacturer: string; articleNumber: string }) => "/" + articleOf(a).glb;

  // The raw bar a rail is cut from belongs to its article, so its length is in the catalog, not on
  // the rail. cutRailModel needs it to check that the cut is possible.
  const barLengthMm = articleOf(rail).barLengthMm;
  if (barLengthMm == null) throw new Error(`${rail.manufacturer} ${rail.articleNumber} has no barLengthMm in catalog.json`);

  const parts = rail.placedItems;
  // Switching rails shows the new rail with all of its parts again.
  const selectRail = (bmk: string) => {
    setRailBmk(bmk);
    setShown(data.rails.find((r) => r.bmk === bmk)!.placedItems.length);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select value={railBmk} onChange={(e) => selectRail(e.target.value)}>
          {data.rails.map((r) => (
            <option key={r.bmk} value={r.bmk}>
              {r.bmk} — cut {r.cutLengthMm} mm
            </option>
          ))}
        </select>
        {/* 0 = the bare rail; the maximum = every part on it. */}
        <input type="range" min={0} max={parts.length} value={shown} onChange={(e) => setShown(Number(e.target.value))} />
        <span>
          {shown}/{parts.length} parts
          {shown > 0 && ` — last added: ${parts[shown - 1].bmk} ${parts[shown - 1].manufacturer} ${parts[shown - 1].articleNumber}`}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {/* fitKey re-frames the camera whenever the rail changes. */}
        <RailCanvas fitKey={railBmk}>
          {/* The rail: its raw-bar GLB, cut to length. The piece sits at the origin. */}
          <RailModel url={glbOf(rail)} cutLengthMm={rail.cutLengthMm} barLengthMm={barLengthMm} />
          {/* The components: each GLB as it is, at its pose. Poses are relative to the rail, which
              sits at the origin, so they land on it without any conversion. */}
          {parts.slice(0, shown).map((p) => (
            <ComponentModel key={p.bmk} url={glbOf(p)} pose={p.pose} />
          ))}
        </RailCanvas>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
