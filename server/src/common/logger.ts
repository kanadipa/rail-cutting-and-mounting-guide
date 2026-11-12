type Level = "info" | "warn" | "error";

/** One JSON object per line, so the bench's log collector can filter by field. */
export function logEvent(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ at: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}
