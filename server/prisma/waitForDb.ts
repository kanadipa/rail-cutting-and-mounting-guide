import { PrismaClient } from "@prisma/client";

/** `docker compose up -d` returns before Postgres accepts connections, so setup waits for it here. */
const ATTEMPTS = 30;
const DELAY_MS = 1000;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      console.log("Database is ready");
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }
  console.error(`Database not reachable at DATABASE_URL after ${ATTEMPTS} s. Is "docker compose up -d" running?`);
  process.exit(1);
}

void main();
