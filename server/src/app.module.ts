import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { PlanModule } from "./plan/plan.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProgressModule } from "./progress/progress.module";

@Module({ imports: [PrismaModule, HealthModule, PlanModule, ProgressModule] })
export class AppModule {}
