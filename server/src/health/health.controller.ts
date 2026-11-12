import { Controller, Get } from "@nestjs/common";
import { AppError } from "../common/appError";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Healthy only when the database answers: the screen uses this to know saving works again. */
  @Get()
  async check(): Promise<{ status: "ok" }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new AppError("DATABASE_UNAVAILABLE", "The database does not answer");
    }
    return { status: "ok" };
  }
}
