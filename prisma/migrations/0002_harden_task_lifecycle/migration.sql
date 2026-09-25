CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in-progress', 'done');
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'paused', 'completed');
ALTER TYPE "TaskStatus" ADD VALUE 'cancelled';
ALTER TYPE "TaskPriority" ADD VALUE 'urgent';

ALTER TABLE "Project"
  ADD COLUMN "status" "ProjectStatus" NOT NULL DEFAULT 'active';

ALTER TABLE "Task"
  ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "Task"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "TaskStatus" USING ("status"::"TaskStatus"),
  ALTER COLUMN "status" SET DEFAULT 'todo',
  ALTER COLUMN "priority" DROP DEFAULT,
  ALTER COLUMN "priority" TYPE "TaskPriority" USING ("priority"::"TaskPriority"),
  ALTER COLUMN "priority" SET DEFAULT 'medium';

UPDATE "Task"
SET "completedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
WHERE "status" = 'done' AND "completedAt" IS NULL;
