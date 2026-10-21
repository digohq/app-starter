-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'TERMINATED');

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "workflow_id" TEXT,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "output" JSONB,
    "error_message" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "videos_organization_id_project_id_createdAt_idx" ON "videos"("organization_id", "project_id", "createdAt");

-- CreateIndex
CREATE INDEX "videos_created_by_id_idx" ON "videos"("created_by_id");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

