import { NextRequest, NextResponse } from "next/server";

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

    // TODO: Forward to actual AI grading service
    // For now, return a mock response indicating the cleaning worked
    // In production, this would call your AI service with cleanedTranscript

    // Example integration with external AI service:
    // const aiResponse = await fetch("https://your-ai-service.com/grade", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.AI_API_KEY}` },
    //   body: JSON.stringify({
    //     transcript: cleanedTranscript,
    //     closer: body.closer,
    //     outcome: body.outcome,
    //     program: body.program,
    //     prospectName: body.prospectName,
    //     callMeta: body.callMeta,
    //   }),
    // });
    // const aiResult = await aiResponse.json();

    // Return success with metadata about the cleaning
    return NextResponse.json({
      version: "v2",
      programProfile: body.program,
      processing: {
        subtitleFormatDetected: wasSubtitleFormat,
        originalLength: body.transcript.length,
        cleanedLength: cleanedTranscript.length,
        charactersRemoved: body.transcript.length - cleanedTranscript.length,
      },
      // TODO: Replace with actual AI grading result
      note: "Transcript cleaned successfully. Connect to AI grading service for full results.",
    });

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
