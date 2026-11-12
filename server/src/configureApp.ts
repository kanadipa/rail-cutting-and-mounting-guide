import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ErrorFilter } from "./common/errorFilter";
import { requestId } from "./common/requestId";

/** Everything the app needs besides its modules; shared by the server and the API tests. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix("api");
  app.use(requestId);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ErrorFilter());
}
