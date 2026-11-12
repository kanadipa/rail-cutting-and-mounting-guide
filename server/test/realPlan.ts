import fs from "node:fs";
import path from "node:path";
import type { CatalogEntry, PlanRail } from "../prisma/import/planFiles";

/** The job shipped in data/, for tests that check the rules against real parts. */
export const PROJECT_ROOT = path.resolve(__dirname, "../..");

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "data", file), "utf8")) as T;

export const realRails = (): PlanRail[] => readJson<PlanRail[]>("placement.json");
export const realCatalog = (): CatalogEntry[] => readJson<CatalogEntry[]>("catalog.json");
