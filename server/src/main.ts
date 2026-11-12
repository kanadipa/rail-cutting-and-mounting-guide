import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { logEvent } from "./common/logger";
import { configureApp } from "./configureApp";

async function bootstrap(): Promise<void> {
  // Nest's own text logs are limited to problems; the app writes JSON lines itself.
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });
  configureApp(app);
  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  logEvent("info", "server.started", { port });
  if (process.env.NODE_ENV !== "production") {
    // The last line of every start under `npm run dev`, so it is not lost between log lines.
    // The web app runs on its own port (WEB_PORT, else Vite's 5173).
    console.log(`\nOperator app: http://localhost:${process.env.WEB_PORT ?? 5173}   <- open this\n`);
  }
}

void bootstrap();
