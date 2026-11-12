-- CreateEnum
CREATE TYPE "PlanWarningCode" AS ENUM ('OVERLAPS_PART', 'PAST_RAIL_END');

-- AlterTable
ALTER TABLE "placed_items" ADD COLUMN     "plan_warning" "PlanWarningCode",
ADD COLUMN     "plan_warning_bmk" TEXT;
