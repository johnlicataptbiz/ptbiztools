/**
 * useGrading
 * Core grading logic: calls the V2 API, handles retry, saves analysis, generates PDF.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { GradeResult } from "@/utils/grader";
import { generatePDF } from "@/utils/pdfGenerator";
import {
  logAction,
  ActionTypes,
  saveCoachingAnalysis,
  savePdfExport,
  gradeDannySalesCallV2,
} from "@/lib/ptbiz-api";
import {
  adaptV2ToGradeResult,
  shouldRetryGrading,
  getTranscriptStats,
} from "../utils";
import { MIN_WORDS } from "../constants";

export interface UseGradingReturn {
  grade: GradeResult | null;
  isGrading: boolean;
  isModalOpen: boolean;
  analysisId: string | undefined;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleGrade: () => Promise<void>;
  handleGeneratePDF: () => Promise<void>;
}

export function useGrading(
  transcript: string,
  coachName: string,
  clientName: string,
  callDate: string,
  sessionId: string
): UseGradingReturn {
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | undefined>(undefined);

  const handleGrade = useCallback(async () => {
    if (!transcript.trim()) {
      toast.error("Please paste or upload a transcript first");
      return;
    }

    const stats = getTranscriptStats(transcript);

    if (stats.wordCount < MIN_WORDS) {
      toast.error(`Transcript is too short. Add at least ${MIN_WORDS} words.`);
      return;
    }

    const closeSectionIndicators = [
      "close", "book", "schedule", "appointment", "next step",
      "follow up", "investment", "price", "cost", "payment",
    ];
    const hasCloseSection = closeSectionIndicators.some((i) =>
      transcript.toLowerCase().includes(i)
    );
    const endIndicators = [
      "goodbye", "bye", "thank you", "thanks", "have a great", "talk soon", "see you",
    ];
    const hasEndIndicator = endIndicators.some((i) =>
      transcript.toLowerCase().includes(i)
    );

    console.log("[DiscoveryCallGrader] Transcript diagnostics:", {
      charCount: transcript.length,
      wordCount: stats.wordCount,
      lineCount: stats.lineCount,
      hasCloseSection,
      hasEndIndicator,
      last200Chars: transcript.slice(-200),
    });

    const ESTIMATED_TOKENS_PER_WORD = 1.3;
    const estimatedTokens = stats.wordCount * ESTIMATED_TOKENS_PER_WORD;
    const MAX_SAFE_TOKENS = 12000;

    if (estimatedTokens > MAX_SAFE_TOKENS) {
      toast.warning(
        `Transcript is very long (~${Math.round(estimatedTokens)} tokens). This may cause truncation. Consider focusing on the most relevant sections.`,
        { duration: 8000, id: "long-transcript-warning" }
      );
    }

    setIsGrading(true);
    toast.loading("Grading transcript...", { id: "grading" });

    await logAction({
      actionType: ActionTypes.TRANSCRIPT_PASTED,
      description: "Transcript prepared for grading",
      metadata: {
        transcriptLength: transcript.length,
        transcriptWordCount: stats.wordCount,
        estimatedTokens: Math.round(estimatedTokens),
        hasCloseSection,
        hasEndIndicator,
      },
      sessionId,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const payload = {
        transcript,
        program: "Rainmaker",
        closer: coachName.trim() || "Unknown",
        prospectName: clientName.trim() || undefined,
        metadata: {
          originalLength: transcript.length,
          wordCount: stats.wordCount,
          hasCloseSection,
          hasEndIndicator,
          clientTimestamp: new Date().toISOString(),
        },
      } as const;

      let response = await gradeDannySalesCallV2(payload);
      if ((response.error || !response.data) && shouldRetryGrading(response)) {
        response = await gradeDannySalesCallV2(payload);
      }

      if (response.error || !response.data) {
        const reasonSuffix = response.reasons?.length
          ? ` ${response.reasons.join(" | ")}`
          : "";
        throw new Error(
          (response.error || "Failed to grade transcript") + reasonSuffix
        );
      }

      const result = adaptV2ToGradeResult(response.data);
      setGrade(result);
      setIsModalOpen(true);
      toast.success(`Grade complete: ${result.score}/100`, { id: "grading" });

      await logAction({
        actionType: ActionTypes.GRADE_GENERATED,
        description: `Grade generated: ${result.score}/100, Outcome: ${result.outcome}`,
        metadata: { score: result.score, outcome: result.outcome },
        sessionId,
      });

      const saved = await saveCoachingAnalysis({
        sessionId,
        coachName,
        clientName,
        callDate,
        grade: {
          score: result.score,
          outcome: result.outcome,
          summary: result.summary,
          phaseScores: response.data.phaseScores,
          strengths: result.strengths,
          improvements: result.improvements,
          redFlags: result.redFlags,
          transcript,
          deidentifiedTranscript:
            response.data.storage?.redactedTranscript ||
            result.deidentifiedTranscript,
          gradingVersion: "v2",
          deterministic: response.data.deterministic,
          criticalBehaviors: response.data.criticalBehaviors,
          confidence: response.data.confidence.score,
          qualityGate: response.data.qualityGate,
          evidence: {
            phases: response.data.phaseScores,
            criticalBehaviors: response.data.criticalBehaviors,
          },
          transcriptHash: response.data.storage?.transcriptHash,
        },
      });

      if (saved.analysisId) {
        setAnalysisId(saved.analysisId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to grade transcript";
      toast.error(errorMessage, { id: "grading" });
      console.error(error);
    } finally {
      setIsGrading(false);
    }
  }, [transcript, coachName, clientName, callDate, sessionId]);

  const handleGeneratePDF = useCallback(async () => {
    if (!grade) return;

    try {
      toast.loading("Generating PDF...", { id: "pdf" });
      await generatePDF(
        grade,
        coachName,
        clientName || "Client",
        callDate || new Date().toLocaleDateString()
      );
      toast.success("PDF downloaded!", { id: "pdf" });

      await logAction({
        actionType: ActionTypes.PDF_GENERATED,
        description: `PDF generated: ${grade.score}/100 for ${clientName || "Client"}`,
        metadata: { score: grade.score, clientName: clientName || "Client" },
        sessionId,
      });

      await savePdfExport({
        sessionId,
        coachingAnalysisId: analysisId,
        coachName,
        clientName: clientName || "Client",
        callDate: callDate || new Date().toLocaleDateString(),
        score: grade.score,
        metadata: {
          tool: "discovery_call_grader",
          outcome: grade.outcome,
          summary: grade.summary,
        },
      });
    } catch (error) {
      toast.error("Failed to generate PDF", { id: "pdf" });
      console.error("Failed to generate PDF:", error);
    }
  }, [grade, coachName, clientName, callDate, sessionId, analysisId]);

  return {
    grade,
    isGrading,
    isModalOpen,
    analysisId,
    setIsModalOpen,
    handleGrade,
    handleGeneratePDF,
  };
}
