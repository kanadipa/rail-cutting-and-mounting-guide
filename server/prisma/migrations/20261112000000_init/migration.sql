-- The whole schema in one migration. Nothing is deployed yet, so the earlier steps were squashed.
-- Generated from schema.prisma; the CHECK constraints at the end are what Prisma cannot express.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlanWarningCode" AS ENUM ('OVERLAPS_PART', 'PAST_RAIL_END');

-- CreateEnum
CREATE TYPE "WorkEventType" AS ENUM ('CUT', 'MOUNT', 'UNMOUNT');

-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "article_number" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "profile_wxh" TEXT,
    "bar_length_mm" DOUBLE PRECISION,
    "glb_path" TEXT NOT NULL,
    "image_path" TEXT,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabinets" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "cabinets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rails" (
    "id" SERIAL NOT NULL,
    "cabinet_id" INTEGER NOT NULL,
    "bmk" TEXT NOT NULL,
    "article_id" INTEGER NOT NULL,
    "cut_length_mm" DOUBLE PRECISION NOT NULL,
    "cut_order" INTEGER NOT NULL,
    "bar_index" INTEGER NOT NULL,
    "bar_offset_mm" DOUBLE PRECISION NOT NULL,
    "part_count" INTEGER NOT NULL,

    CONSTRAINT "rails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placed_items" (
    "id" SERIAL NOT NULL,
    "rail_id" INTEGER NOT NULL,
    "bmk" TEXT NOT NULL,
    "article_id" INTEGER NOT NULL,
    "pose" JSONB NOT NULL,
    "mount_seq" INTEGER NOT NULL,
    "x_start_mm" DOUBLE PRECISION NOT NULL,
    "x_end_mm" DOUBLE PRECISION NOT NULL,
    "z_min_mm" DOUBLE PRECISION NOT NULL,
    "gap_before_mm" DOUBLE PRECISION NOT NULL,
    "mounts_on_item_id" INTEGER,
    "labels_first_seq" INTEGER,
    "labels_last_seq" INTEGER,
    "plan_warning" "PlanWarningCode",
    "plan_warning_item_id" INTEGER,

    CONSTRAINT "placed_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rail_progress" (
    "rail_id" INTEGER NOT NULL,
    "cut_at" TIMESTAMP(3),
    "mounted_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "operator_id" TEXT,

    CONSTRAINT "rail_progress_pkey" PRIMARY KEY ("rail_id")
);

-- CreateTable
CREATE TABLE "work_events" (
    "id" SERIAL NOT NULL,
    "cabinet_id" INTEGER NOT NULL,
    "rail_id" INTEGER NOT NULL,
    "placed_item_id" INTEGER,
    "type" "WorkEventType" NOT NULL,
    "operator_id" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_manufacturer_article_number_key" ON "articles"("manufacturer", "article_number");

-- CreateIndex
CREATE UNIQUE INDEX "cabinets_name_key" ON "cabinets"("name");

-- CreateIndex
CREATE INDEX "rails_article_id_idx" ON "rails"("article_id");

-- CreateIndex
CREATE UNIQUE INDEX "rails_cabinet_id_bmk_key" ON "rails"("cabinet_id", "bmk");

-- CreateIndex
CREATE UNIQUE INDEX "rails_cabinet_id_cut_order_key" ON "rails"("cabinet_id", "cut_order");

-- CreateIndex
CREATE INDEX "placed_items_article_id_idx" ON "placed_items"("article_id");

-- CreateIndex
CREATE INDEX "placed_items_plan_warning_item_id_idx" ON "placed_items"("plan_warning_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "placed_items_rail_id_bmk_key" ON "placed_items"("rail_id", "bmk");

-- CreateIndex
CREATE UNIQUE INDEX "placed_items_rail_id_mount_seq_key" ON "placed_items"("rail_id", "mount_seq");

-- CreateIndex
CREATE INDEX "work_events_cabinet_id_at_idx" ON "work_events"("cabinet_id", "at");

-- CreateIndex
CREATE INDEX "work_events_rail_id_idx" ON "work_events"("rail_id");

-- CreateIndex
CREATE INDEX "work_events_placed_item_id_idx" ON "work_events"("placed_item_id");

-- AddForeignKey
ALTER TABLE "rails" ADD CONSTRAINT "rails_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rails" ADD CONSTRAINT "rails_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placed_items" ADD CONSTRAINT "placed_items_rail_id_fkey" FOREIGN KEY ("rail_id") REFERENCES "rails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placed_items" ADD CONSTRAINT "placed_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placed_items" ADD CONSTRAINT "placed_items_mounts_on_item_id_fkey" FOREIGN KEY ("mounts_on_item_id") REFERENCES "placed_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placed_items" ADD CONSTRAINT "placed_items_plan_warning_item_id_fkey" FOREIGN KEY ("plan_warning_item_id") REFERENCES "placed_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rail_progress" ADD CONSTRAINT "rail_progress_rail_id_fkey" FOREIGN KEY ("rail_id") REFERENCES "rails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_events" ADD CONSTRAINT "work_events_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_events" ADD CONSTRAINT "work_events_rail_id_fkey" FOREIGN KEY ("rail_id") REFERENCES "rails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_events" ADD CONSTRAINT "work_events_placed_item_id_fkey" FOREIGN KEY ("placed_item_id") REFERENCES "placed_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Invariants Prisma's schema language cannot express.
-- `mounted_count <= part_count` spans two tables (rail_progress and rails), which a CHECK cannot
-- express; the progress service enforces it inside its transaction, against the locked row.

ALTER TABLE "rails"
  ADD CONSTRAINT "rails_cut_length_positive" CHECK ("cut_length_mm" > 0);

ALTER TABLE "rails"
  ADD CONSTRAINT "rails_part_count_not_negative" CHECK ("part_count" >= 0);

ALTER TABLE "placed_items"
  ADD CONSTRAINT "placed_items_mount_seq_positive" CHECK ("mount_seq" >= 1);

ALTER TABLE "rail_progress"
  ADD CONSTRAINT "rail_progress_mounted_count_not_negative" CHECK ("mounted_count" >= 0);

-- Nothing can be mounted on a rail that has not been cut.
ALTER TABLE "rail_progress"
  ADD CONSTRAINT "rail_progress_mounted_only_when_cut" CHECK ("cut_at" IS NOT NULL OR "mounted_count" = 0);
