CREATE TYPE "EvidenceKind" AS ENUM ('url', 'note');

CREATE TABLE "Evidence" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Evidence_kind_payload_check" CHECK (
      ("kind" = 'url'  AND "url" IS NOT NULL AND "body" IS NULL) OR
      ("kind" = 'note' AND "body" IS NOT NULL AND "url" IS NULL)
    )
);

CREATE INDEX "Evidence_taskId_createdAt_idx" ON "Evidence"("taskId", "createdAt");
CREATE INDEX "Evidence_userId_createdAt_idx" ON "Evidence"("userId", "createdAt");

ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
