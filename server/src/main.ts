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
}

void bootstrap();
