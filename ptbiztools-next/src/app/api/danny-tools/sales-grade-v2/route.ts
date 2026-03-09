import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// VTT/SRT timestamp patterns to strip
const TIMESTAMP_PATTERNS = {
  // VTT/SRT timestamp lines: "00:00:21.660 --> 00:00:22.810" or "00:00:21,660 --> 00:00:22,810"
  timestampLine: /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}\s*$/gm,
  
  // WEBVTT header
  webvttHeader: /^WEBVTT.*$/gim,
  
  // Standalone cue identifiers (just numbers on their own line)
  cueIdentifier: /^\d+\s*$/gm,
  
  // SRT index numbers followed by timestamp on next line (handled by timestampLine)
  // Additional VTT cues like "NOTE", "STYLE", "REGION"
  vttCueSettings: /^\w+::?\s*\w+.*$/gm,
};

/**
 * Strips VTT/SRT subtitle format timestamps and metadata from transcript
 * This prevents AI from misinterpreting timestamps as call duration
 */
function cleanSubtitleFormat(transcript: string): string {
  if (!transcript || typeof transcript !== "string") {
    return transcript;
  }

  let cleaned = transcript;

  // Remove WEBVTT header
  cleaned = cleaned.replace(TIMESTAMP_PATTERNS.webvttHeader, "");

  // Remove timestamp lines (the main issue)
  cleaned = cleaned.replace(TIMESTAMP_PATTERNS.timestampLine, "");

  // Remove standalone cue identifiers (just numbers)
  cleaned = cleaned.replace(TIMESTAMP_PATTERNS.cueIdentifier, "");

  // Remove VTT cue settings lines
  cleaned = cleaned.replace(TIMESTAMP_PATTERNS.vttCueSettings, "");

  // Clean up excessive whitespace
  cleaned = cleaned
    .replace(/\n{3,}/g, "\n\n") // Collapse 3+ newlines to 2
    .replace(/[ \t]+\n/g, "\n") // Remove trailing spaces
    .replace(/\n[ \t]+/g, "\n") // Remove leading spaces
    .trim();

  return cleaned;
}

/**
 * Detects if transcript is in subtitle format
 */
function isSubtitleFormat(transcript: string): boolean {
  if (!transcript || typeof transcript !== "string") {
    return false;
  }
  // Check for VTT/SRT timestamp pattern
  const timestampPattern = /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/;
  return timestampPattern.test(transcript);
}

// Phase weights for deterministic scoring
const PHASE_WEIGHTS = {
  connection: 10,
  discovery: 25,
  gap_creation: 20,
  temp_check: 10,
  solution: 15,
  close: 15,
  followup: 5,
};

interface GradeRequest {
  transcript: string;
  closer: string;
  outcome?: "Won" | "Lost";
  program: "Rainmaker" | "Mastermind";
  prospectName?: string;
  callMeta?: {
    durationMinutes?: number;
  };
}

// AI Grading Schema
const PhaseSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  evidence: z.array(z.string()),
});

const BehaviorSchema = z.object({
  status: z.enum(["pass", "fail", "unknown"]),
  note: z.string(),
  evidence: z.array(z.string()),
});

const GradingResultSchema = z.object({
  version: z.literal("v2"),
  programProfile: z.enum(["Rainmaker", "Mastermind"]),
  phases: z.object({
    connection: PhaseSchema,
    discovery: PhaseSchema,
    gap_creation: PhaseSchema,
    temp_check: PhaseSchema,
    solution: PhaseSchema,
    close: PhaseSchema,
    followup: PhaseSchema,
  }),
  criticalBehaviors: z.object({
    free_consulting: BehaviorSchema,
    discount_discipline: BehaviorSchema,
    emotional_depth: BehaviorSchema,
    time_management: BehaviorSchema,
    personal_story: BehaviorSchema,
  }),
  deterministic: z.object({
    weightedPhaseScore: z.number(),
    penaltyPoints: z.number(),
    unknownPenalty: z.number(),
    overallScore: z.number(),
  }),
  confidence: z.object({
    score: z.number().min(0).max(100),
    evidenceCoverage: z.number(),
    quoteVerificationRate: z.number(),
    transcriptQuality: z.number(),
  }),
  qualityGate: z.object({
    accepted: z.boolean(),
    reasons: z.array(z.string()),
  }),
  highlights: z.object({
    topStrength: z.string(),
    topImprovement: z.string(),
    prospectSummary: z.string(),
  }),
  metadata: z.object({
    closer: z.string(),
    outcome: z.string(),
    model: z.string(),
  }),
});

/**
 * Build the grading prompt for the AI
 */
function buildGradingPrompt(params: {
  transcript: string;
  closer: string;
  outcome?: "Won" | "Lost";
  program: "Rainmaker" | "Mastermind";
  prospectName?: string;
  callMeta?: { durationMinutes?: number };
}): string {
  const { transcript, closer, outcome, program, prospectName, callMeta } = params;

  return `You are an expert sales coach evaluating a PT (Physical Therapy) business coaching sales call. You are STRICT and CRITICAL - do not inflate scores. Most calls score 40-70. Only exceptional calls score 80+.

CLOSER: ${closer}
PROGRAM: ${program}
OUTCOME: ${outcome || "Unknown"}
${prospectName ? `PROSPECT: ${prospectName}` : ""}
${callMeta?.durationMinutes ? `CALL DURATION: ~${callMeta.durationMinutes} minutes` : ""}

TRANSCRIPT:
"""
${transcript}
"""

STRICT SCORING RUBRIC - Score each phase 0-100 using these criteria:

1. CONNECTION & AGENDA (10%):
   90-100: Exceptional rapport, clear agenda with time check, prospect engaged immediately
   70-89: Good rapport, agenda set but rushed or unclear
   50-69: Basic rapport, weak agenda, no time check
   30-49: Poor rapport, no agenda, awkward start
   0-29: No connection attempt, jumped straight to pitch

2. DISCOVERY (25%) - MOST IMPORTANT:
   90-100: Deep emotional discovery (Feelings/Future), uncovered real pain, prospect opened up
   70-89: Good facts gathering, some feelings, missed deeper pain
   50-69: Surface-level KPIs only, no emotional depth
   30-49: Weak discovery, mostly pitching
   0-29: No discovery, immediate pitch

3. GAP CREATION (20%):
   90-100: Clear cost of inaction calculated, prospect acknowledged pain of staying same
   70-89: Some gap mentioned but not quantified
   50-69: Weak gap, prospect not emotionally connected to pain
   30-49: No real gap created
   0-29: Skipped entirely

4. TEMPERATURE CHECK (10%):
   90-100: Explicit readiness check, adjusted approach based on response
   70-89: Some checking but not explicit
   50-69: Weak or no temperature check
   0-49: Completely missed

5. SOLUTION PRESENTATION (15%):
   90-100: Personal story deployed, calibrated to prospect's specific pain, NOT a platform demo
   70-89: Some calibration but generic elements
   50-69: Platform demo style, not calibrated
   30-49: Generic pitch, no story
   0-29: No solution presentation or completely off

6. INVESTMENT & CLOSE (15%):
   90-100: Clear ask, handled objections well, no discounting, confident close
   70-89: Ask made but weak objection handling
   50-69: Weak ask or some discounting
   30-49: No clear ask, heavy discounting
   0-29: No close attempt or completely botched

7. FOLLOW-UP / WRAP (5%):
   ${outcome === "Won" 
     ? "For WON deals: Evaluate clean handoff to onboarding, no lingering questions, clear next steps for implementation (90-100: perfect handoff, 50-89: some loose ends, 0-49: messy close)" 
     : "For non-won deals: Clear next steps scheduled, no free consulting (90-100: perfect wrap, 50-89: some loose ends, 0-49: messy or no next steps)"}

CRITICAL BEHAVIORS - Mark FAIL if ANY of these occurred:
- Free Consulting: Gave away actionable advice before commitment = FAIL
- Discount Discipline: Unprompted concessions or ad-hoc discounts = FAIL  
- Emotional Depth: Stayed surface-level, no real feelings uncovered = FAIL
- Time Management: Call over 60 min OR lingered after clear 'no' = FAIL
- Story Deployment: No personal/client transformation story used = FAIL

REQUIREMENTS:
1. Be CRITICAL - most calls are average (50-70), not excellent
2. Provide 2-3 specific evidence quotes for EACH phase
3. Evidence must be VERBATIM from transcript
4. If behavior not demonstrated, mark UNKNOWN not PASS
5. Only mark PASS if explicitly demonstrated with evidence

Return complete grading with all fields.`;
}

/**
 * Simple hash function for transcript integrity
 */
async function hashTranscript(transcript: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(transcript);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GradeRequest;

    // Validate required fields
    if (!body.transcript || typeof body.transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript is required", reasons: ["Missing transcript field"] },
        { status: 400 }
      );
    }

    if (!body.closer || typeof body.closer !== "string") {
      return NextResponse.json(
        { error: "Closer name is required", reasons: ["Missing closer field"] },
        { status: 400 }
      );
    }

    if (!body.program || !["Rainmaker", "Mastermind"].includes(body.program)) {
      return NextResponse.json(
        { error: "Valid program is required (Rainmaker or Mastermind)", reasons: ["Invalid or missing program field"] },
        { status: 400 }
      );
    }

    // Clean the transcript of subtitle format timestamps
    const wasSubtitleFormat = isSubtitleFormat(body.transcript);
    const cleanedTranscript = cleanSubtitleFormat(body.transcript);

    // Log for debugging
    console.log("[sales-grade-v2] Transcript processing:", {
      originalLength: body.transcript.length,
      cleanedLength: cleanedTranscript.length,
      wasSubtitleFormat,
      charDiff: body.transcript.length - cleanedTranscript.length,
    });

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI grading service not configured", reasons: ["OPENAI_API_KEY not set"] },
        { status: 503 }
      );
    }

    // Call AI grading service with cleaned transcript
    try {
      const aiResult = await generateObject({
        model: openai("gpt-4.1-mini"),
        schema: GradingResultSchema,
        prompt: buildGradingPrompt({
          transcript: cleanedTranscript,
          closer: body.closer,
          outcome: body.outcome,
          program: body.program,
          prospectName: body.prospectName,
          callMeta: body.callMeta,
        }),
      });

      // Transform AI result to match expected frontend format
      const result = {
        ...aiResult.object,
        overall_score: aiResult.object.deterministic.overallScore,
        top_strength: aiResult.object.highlights.topStrength,
        top_improvement: aiResult.object.highlights.topImprovement,
        prospect_summary: aiResult.object.highlights.prospectSummary,
        phases: aiResult.object.phases,
        critical_behaviors: aiResult.object.criticalBehaviors,
        storage: {
          redactedTranscript: cleanedTranscript.slice(0, 1000), // Store first 1000 chars for reference
          transcriptHash: await hashTranscript(cleanedTranscript),
        },
      };

      return NextResponse.json(result);
    } catch (aiError) {
      console.error("[sales-grade-v2] AI grading failed:", aiError);
      return NextResponse.json(
        { 
          error: "AI grading failed", 
          reasons: [aiError instanceof Error ? aiError.message : "Unknown AI error"],
          processing: {
            subtitleFormatDetected: wasSubtitleFormat,
            originalLength: body.transcript.length,
            cleanedLength: cleanedTranscript.length,
            charactersRemoved: body.transcript.length - cleanedTranscript.length,
          },
        },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error("[sales-grade-v2] Error processing request:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { 
        error: "Failed to process sales call grading", 
        reasons: [errorMessage],
      },
      { status: 500 }
    );
  }
}

// Also handle transcript extraction/cleaning endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    const wasSubtitleFormat = isSubtitleFormat(transcript);
    const cleanedTranscript = cleanSubtitleFormat(transcript);

    return NextResponse.json({
      success: true,
      wasSubtitleFormat,
      originalLength: transcript.length,
      cleanedLength: cleanedTranscript.length,
      charactersRemoved: transcript.length - cleanedTranscript.length,
      cleanedTranscript,
    });
  } catch (error) {
    console.error("[sales-grade-v2] Error cleaning transcript:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to clean transcript", reasons: [errorMessage] },
      { status: 500 }
    );
  }
}
