-- Add onboarding tour persistence fields to users
ALTER TABLE "User"
ADD COLUMN "onboardingTourVersion" TEXT,
ADD COLUMN "onboardingTourCompletedAt" TIMESTAMP(3),
ADD COLUMN "onboardingToolIntros" JSONB;
