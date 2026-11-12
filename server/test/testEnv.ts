import path from "node:path";
import dotenv from "dotenv";

/**
 * Points Prisma at the test database. Tests never touch the development database, so they can
 * delete and rewrite rows freely.
 */
export function useTestDatabase(): string {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set. Run `npm run setup` first (it creates .env).");
  process.env.DATABASE_URL = url;
  return url;
}
