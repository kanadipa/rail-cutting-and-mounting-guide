import { execSync } from "node:child_process";
import path from "node:path";
import { useTestDatabase } from "./testEnv";

/** Creates the test database if needed and brings it to the current schema, once per run. */
export default function setup(): void {
  const url = useTestDatabase();
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
