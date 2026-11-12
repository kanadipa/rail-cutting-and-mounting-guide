import type { PlanWarning } from "../../src/domain/planWarnings";
import type { ImportedRail } from "./importPlan";

/** The computed order of each rail as a plain-text table, for checking an import by eye. */
export function formatSummary(rails: ImportedRail[]): string {
  return rails.map(formatRail).join("\n\n");
}

function formatRail(rail: ImportedRail): string {
  const header = ["seq", "BMK", "category", "xStart", "gap", "mountsOn"];
  const rows = rail.steps.map((step) => [
    String(step.mountSeq),
    step.bmk,
    step.category,
    step.xStartMm.toFixed(1),
    step.gapBeforeMm.toFixed(1),
    [step.mountsOnBmk, carrierSpan(rail, step.labelsFirstSeq, step.labelsLastSeq)].filter(Boolean).join(" "),
  ]);
  const widths = header.map((_, column) => Math.max(...[header, ...rows].map((row) => row[column].length)));
  const line = (row: string[]) => row.map((cell, column) => cell.padEnd(widths[column])).join("  ").trimEnd();

  return [
    `Rail ${rail.bmk}: cut ${rail.cutLengthMm} mm (cut ${rail.cutOrder}, bar ${rail.barIndex + 1} at ${rail.barOffsetMm} mm), ${rail.steps.length} parts`,
    line(header),
    ...rows.map(line),
    ...rail.steps.flatMap((step) => (step.planWarning ? [`  plan check: ${describeWarning(step.bmk, step.planWarning)}`] : [])),
  ].join("\n");
}

function carrierSpan(rail: ImportedRail, firstSeq: number | null, lastSeq: number | null): string {
  if (firstSeq === null || lastSeq === null) return "";
  const bmkAt = (seq: number) => rail.steps[seq - 1].bmk;
  return firstSeq === lastSeq ? `(labels ${bmkAt(firstSeq)})` : `(labels ${bmkAt(firstSeq)} … ${bmkAt(lastSeq)})`;
}

const describeWarning = (bmk: string, warning: PlanWarning): string =>
  warning.code === "OVERLAPS_PART"
    ? `${bmk} sits on the same stretch of rail as ${warning.otherBmk}`
    : `${bmk} reaches past the end of the rail`;
