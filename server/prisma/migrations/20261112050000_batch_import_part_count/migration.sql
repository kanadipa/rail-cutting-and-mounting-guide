-- Rails keep their part count; a plan warning points at the part itself; history lookups by part.
-- Existing rows are carried over, so this is safe on a database that already has a plan.

-- 1. rails.part_count, filled from the parts that exist now.
ALTER TABLE "rails" ADD COLUMN "part_count" INTEGER;
UPDATE "rails" r SET "part_count" = (SELECT count(*) FROM "placed_items" p WHERE p."rail_id" = r."id");
ALTER TABLE "rails" ALTER COLUMN "part_count" SET NOT NULL;
ALTER TABLE "rails" ADD CONSTRAINT "rails_part_count_not_negative" CHECK ("part_count" >= 0);
-- `mounted_count <= part_count` spans two tables (rail_progress and rails), which a CHECK cannot
-- express; the progress service enforces it inside its transaction, against the locked row.

-- 2. placed_items.plan_warning_item_id replaces plan_warning_bmk.
ALTER TABLE "placed_items" ADD COLUMN "plan_warning_item_id" INTEGER;
UPDATE "placed_items" p SET "plan_warning_item_id" = o."id"
  FROM "placed_items" o
  WHERE o."rail_id" = p."rail_id" AND o."bmk" = p."plan_warning_bmk";
ALTER TABLE "placed_items" DROP COLUMN "plan_warning_bmk";
ALTER TABLE "placed_items"
  ADD CONSTRAINT "placed_items_plan_warning_item_id_fkey"
  FOREIGN KEY ("plan_warning_item_id") REFERENCES "placed_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "placed_items_plan_warning_item_id_idx" ON "placed_items"("plan_warning_item_id");

-- 3. History of one part.
CREATE INDEX "work_events_placed_item_id_idx" ON "work_events"("placed_item_id");
