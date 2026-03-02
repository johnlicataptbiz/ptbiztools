-- Ensure KnowledgeDoc schema matches Prisma model in production.
ALTER TABLE "KnowledgeDoc"
  ADD COLUMN IF NOT EXISTS "slug" TEXT,
  ADD COLUMN IF NOT EXISTS "version" TEXT NOT NULL DEFAULT '2026.02',
  ADD COLUMN IF NOT EXISTS "checksum" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeDoc_slug_key" ON "KnowledgeDoc"("slug");

