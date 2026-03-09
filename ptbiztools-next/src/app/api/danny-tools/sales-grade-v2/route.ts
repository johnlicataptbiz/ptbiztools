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
    outcome: z.string().optional(),
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

  return `You are an expert sales coach evaluating a PT (Physical Therapy) business coaching sales call.

CLOSER: ${closer}
PROGRAM: ${program}
OUTCOME: ${outcome || "Unknown"}
${prospectName ? `PROSPECT: ${prospectName}` : ""}
${callMeta?.durationMinutes ? `CALL DURATION: ~${callMeta.durationMinutes} minutes` : ""}

TRANSCRIPT:
"""
${transcript}
"""

Evaluate this call using the 7-phase framework:

1. CONNECTION & AGENDA (10%): Rapport building, agenda setting, tone establishment
2. DISCOVERY (25%): Facts, Feelings, Future — emotional depth, not just KPIs
3. GAP CREATION (20%): Cost of inaction, math exercise, skills gap identification
4. TEMPERATURE CHECK (10%): Did they gauge readiness? Did they act on it appropriately?
5. SOLUTION PRESENTATION (15%): Calibrated to prospect, personal story deployed, not a platform demo
6. INVESTMENT & CLOSE (15%): Price presentation, objection handling, the ask, discount discipline
7. FOLLOW-UP / WRAP (5%): Clean exit, next steps scheduled, no lingering free consulting

CRITICAL BEHAVIORS to evaluate:
- No Free Consulting: Did NOT give away actionable advice before commitment
- Discount Discipline: No unprompted concessions or ad-hoc discounts
- Emotional Depth: Went beyond surface answers to uncover real feelings/fears
- Time Management: Call stayed under 60 min, didn't linger after clear 'no'
- Story Deployment: Used personal or client transformation story effectively

Provide specific evidence (direct quotes) for each phase score. Score each phase 0-100 based on the rubric.

Return a complete grading result with all fields in the specified schema.`;
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
