import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(root, "data", file), "utf8")) as T;

interface Article {
  manufacturer: string;
  articleNumber: string;
}
interface PlacedItem extends Article {
  bmk: string;
  pose: { positionMm: number[]; quaternion: number[] };
}
interface Rail extends Article {
  bmk: string;
  cutLengthMm: number;
  placedItems: PlacedItem[];
}
interface CatalogEntry extends Article {
  glb: string;
  image: string | null;
  barLengthMm?: number;
}

const rails = read<Rail[]>("placement.json");
const catalog = read<CatalogEntry[]>("catalog.json");
const items = rails.flatMap((r) => r.placedItems);

/** An article is named by its manufacturer and the manufacturer's own article number, together. */
const articleKey = (a: Article) => `${a.manufacturer} ${a.articleNumber}`;
const articleKeys = new Set(catalog.map(articleKey));

describe("data", () => {
  it("gives every rail and every placed item a BMK of its own", () => {
    const bmks = [...rails.map((r) => r.bmk), ...items.map((p) => p.bmk)];
    expect(new Set(bmks).size).toBe(bmks.length);
  });

  it("names every catalog article once", () => {
    expect(articleKeys.size).toBe(catalog.length);
  });

  it("finds every rail's and every placed item's article in the catalog", () => {
    for (const r of rails) expect(articleKeys, r.bmk).toContain(articleKey(r));
    for (const p of items) expect(articleKeys, p.bmk).toContain(articleKey(p));
  });

  it("ships every file the catalog names, and no file it does not", () => {
    const named = new Set<string>();
    for (const c of catalog) {
      for (const file of [c.glb, c.image]) {
        if (!file) continue;
        expect(fs.existsSync(path.join(root, file)), file).toBe(true);
        named.add(file);
      }
    }
    for (const dir of ["assets/glb", "assets/images"]) {
      for (const f of fs.readdirSync(path.join(root, dir))) expect(named, `${dir}/${f}`).toContain(`${dir}/${f}`);
    }
  });

  it("only asks for cuts the rail's bar allows", () => {
    for (const r of rails) {
      const bar = catalog.find((c) => articleKey(c) === articleKey(r))?.barLengthMm;
      expect(bar, `${r.bmk}: its article has no barLengthMm`).toBeGreaterThan(0);
      expect(r.cutLengthMm, r.bmk).toBeGreaterThan(0);
      expect(r.cutLengthMm, r.bmk).toBeLessThanOrEqual(bar!);
    }
  });

  it("puts at least one item on every rail", () => {
    for (const r of rails) expect(r.placedItems.length, r.bmk).toBeGreaterThan(0);
  });

  it("gives every placed item a well-formed pose", () => {
    for (const p of items) {
      expect(p.pose.positionMm, p.bmk).toHaveLength(3);
      expect(p.pose.quaternion, p.bmk).toHaveLength(4);
      expect(Math.abs(Math.hypot(...p.pose.quaternion) - 1), p.bmk).toBeLessThan(1e-4);
    }
  });
});
