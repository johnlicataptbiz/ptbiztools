-- Add deterministic grading v2 fields to CoachingAnalysis
ALTER TABLE "CoachingAnalysis"
  ADD COLUMN IF NOT EXISTS "gradingVersion" TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS "deterministic" JSONB,
  ADD COLUMN IF NOT EXISTS "criticalBehaviors" JSONB,
  ADD COLUMN IF NOT EXISTS "confidence" INTEGER,
  ADD COLUMN IF NOT EXISTS "qualityGate" JSONB,
  ADD COLUMN IF NOT EXISTS "evidence" JSONB,
  ADD COLUMN IF NOT EXISTS "transcriptHash" TEXT;
