UPDATE "Task" SET "progress" = LEAST(GREATEST("progress", 0), 100);
UPDATE "Task" SET "completedAt" = COALESCE("completedAt", "updatedAt") WHERE "status" = 'done' AND "completedAt" IS NULL;
UPDATE "Task" SET "completedAt" = NULL WHERE "status" <> 'done' AND "completedAt" IS NOT NULL;
UPDATE "Task" SET "progress" = 100 WHERE "status" = 'done';

ALTER TABLE "Task" ADD CONSTRAINT "Task_progress_range_check" CHECK ("progress" BETWEEN 0 AND 100);
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedAt_matches_status_check" CHECK (("status" = 'done') = ("completedAt" IS NOT NULL));

CREATE INDEX "Task_userId_completedAt_idx" ON "Task"("userId", "completedAt");
CREATE INDEX "ActivityEvent_userId_type_occurredAt_idx" ON "ActivityEvent"("userId", "type", "occurredAt");
