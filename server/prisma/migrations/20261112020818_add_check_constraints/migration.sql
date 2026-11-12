-- Invariants Prisma's schema language cannot express.
-- `mounted_count <= number of parts on the rail` needs a join, so the progress service
-- enforces it inside its transaction instead.

ALTER TABLE "rails"
  ADD CONSTRAINT "rails_cut_length_positive" CHECK ("cut_length_mm" > 0);

ALTER TABLE "placed_items"
  ADD CONSTRAINT "placed_items_mount_seq_positive" CHECK ("mount_seq" >= 1);

ALTER TABLE "rail_progress"
  ADD CONSTRAINT "rail_progress_mounted_count_not_negative" CHECK ("mounted_count" >= 0);

-- Nothing can be mounted on a rail that has not been cut.
ALTER TABLE "rail_progress"
  ADD CONSTRAINT "rail_progress_mounted_only_when_cut" CHECK ("cut_at" IS NOT NULL OR "mounted_count" = 0);
