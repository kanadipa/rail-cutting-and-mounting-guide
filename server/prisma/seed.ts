import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { formatSummary } from "./import/formatSummary";
import { CabinetExistsError, importPlan } from "./import/importPlan";
import type { CatalogEntry, PlanRail } from "./import/planFiles";
import { PlanValidationError } from "./import/validatePlan";

/** The data files describe one cabinet and do not name it. */
const CABINET_NAME = "Cabinet 1";
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "data", file), "utf8")) as T;

async function main(): Promise<void> {
  const reset = process.argv.includes("--reset");
  const prisma = new PrismaClient();
  try {
    const result = await importPlan(prisma, {
      cabinetName: CABINET_NAME,
      rails: readJson<PlanRail[]>("placement.json"),
      catalog: readJson<CatalogEntry[]>("catalog.json"),
      projectRoot: PROJECT_ROOT,
      reset,
    });
    console.log(`${reset ? "Re-imported" : "Imported"} "${CABINET_NAME}" (cabinet ${result.cabinetId}).\n`);
    console.log(formatSummary(result.rails));
  } catch (error) {
    if (error instanceof CabinetExistsError) {
      // Not a failure: re-running setup must leave a job in progress alone.
      console.log(`${error.message}\nTo import it again and delete its progress: npm run seed:reset`);
    } else if (error instanceof PlanValidationError) {
      console.error(error.message);
      process.exitCode = 1;
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
