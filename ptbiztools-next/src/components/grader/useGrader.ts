// Shared hook for grading logic

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  logAction,
  ActionTypes,
  saveCoachingAnalysis,
  savePdfExport,
  gradeDannySalesCallV2,
  extractTranscriptFromFile,
  type SalesGradeV2Response,
} from '@/lib/ptbiz-api';
import type { GraderInputData, GraderResultData, UploadedFile, TranscriptStats } from './types';

const MIN_WORDS = 120;
const ESTIMATED_TOKENS_PER_WORD = 1.3;
const MAX_SAFE_TOKENS = 12000;

export function useGrader(sessionId: string) {
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gradingElapsed, setGradingElapsed] = useState(0);
  const [gradingStageIndex, setGradingStageIndex] = useState(0);

  const reset = useCallback(() => {
    setIsGrading(false);
    setError(null);
    setGradingElapsed(0);
    setGradingStageIndex(0);
  }, []);

  const getTranscriptStats = useCallback((text: string): TranscriptStats => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
    return {
      wordCount: words.length,
      charCount: text.length,
      lineCount: trimmed ? trimmed.split(/\n+/).length : 0,
      questionCount: (text.match(/\?/g) || []).length,
      estimatedMinutes: words.length > 0 ? Math.max(1, Math.round(words.length / 145)) : 0,
    };
  }, []);

  const validateTranscript = useCallback((text: string): { valid: boolean; error?: string } => {
    const stats = getTranscriptStats(text);
    if (stats.wordCount < MIN_WORDS) {
      return {
        valid: false,
        error: `Transcript must be at least ${MIN_WORDS} words. Current: ${stats.wordCount} words.`,
      };
    }
    return { valid: true };
  }, [getTranscriptStats]);

  const checkTranscriptQuality = useCallback((text: string, wordCount: number) => {
    const estimatedTokens = wordCount * ESTIMATED_TOKENS_PER_WORD;
    
    // Check for close section indicators
    const closeSectionIndicators = ['close', 'book', 'schedule', 'appointment', 'next step', 'follow up', 'investment', 'price', 'cost', 'payment', 'sign up', 'enroll'];
    const hasCloseSection = closeSectionIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
    
    // Check for end-of-call indicators
    const endIndicators = ['goodbye', 'bye', 'thank you', 'thanks', 'have a great', 'talk soon', 'see you', 'take care'];
    const hasEndIndicator = endIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );

    // Warning for very long transcripts
    if (estimatedTokens > MAX_SAFE_TOKENS) {
      toast.warning(`Transcript is very long (~${Math.round(estimatedTokens)} tokens). This may cause truncation. Consider focusing on the most relevant sections.`, {
        duration: 8000,
        id: 'long-transcript-warning',
      });
    }

    return {
      hasCloseSection,
      hasEndIndicator,
      estimatedTokens,
    };
  }, []);

  const handleFileUpload = useCallback(async (file: File): Promise<UploadedFile | null> => {
    try {
      const extracted = await extractTranscriptFromFile(file);
      if (extracted.error || !extracted.text) {
        toast.error(extracted.error || 'Could not read transcript file');
        return null;
      }

      await logAction({
        actionType: ActionTypes.TRANSCRIPT_UPLOADED,
        description: `Uploaded transcript file: ${file.name}`,
        metadata: { 
          sourceType: extracted.sourceType || 'text', 
          wordCount: extracted.wordCount || 0 
        },
        sessionId,
      });

      return {
        name: file.name,
        type: extracted.sourceType || 'text',
        text: extracted.text,
      };
    } catch (error) {
      console.error(error);
      toast.error('Could not read transcript file. Use PDF, TXT, MD, CSV, JSON, RTF, XLSX, PNG, JPG, or WEBP.');
      return null;
    }
  }, [sessionId]);

  const gradeTranscript = useCallback(async (
    inputData: GraderInputData,
    onSuccess: (result: GraderResultData) => void,
    onError?: (error: string) => void
  ): Promise<void> => {
    const { transcript, coachName, clientName, callDate, outcome, program, prospectName } = inputData;
    
    // Validation
    const validation = validateTranscript(transcript);
    if (!validation.valid) {
      const errorMsg = validation.error || 'Validation failed';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const stats = getTranscriptStats(transcript);
    const quality = checkTranscriptQuality(transcript, stats.wordCount);

    setIsGrading(true);
    setError(null);
    toast.loading('Grading transcript...', { id: 'grading' });

    // Start grading timer
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setGradingElapsed(elapsed);
      setGradingStageIndex(Math.min(3, Math.floor(elapsed / 3)));
    }, 1000);

    await logAction({
      actionType: ActionTypes.TRANSCRIPT_PASTED,
      description: 'Transcript prepared for grading',
      metadata: {
        transcriptLength: transcript.length,
        transcriptWordCount: stats.wordCount,
        estimatedTokens: Math.round(quality.estimatedTokens),
        hasCloseSection: quality.hasCloseSection,
        hasEndIndicator: quality.hasEndIndicator,
      },
      sessionId,
    });

    try {
    const payload = {
        transcript,
        program: (program || 'Rainmaker') as "Rainmaker" | "Mastermind",
        closer: coachName.trim() || 'Unknown',
        prospectName: prospectName || clientName.trim() || undefined,
        outcome: outcome as "Won" | "Lost" | undefined,
        callMeta: {
          durationMinutes: Math.round(stats.wordCount / 145),
        }
      };

      const response = await gradeDannySalesCallV2(payload);

      if (response.error || !response.data) {
        const reasonSuffix = response.reasons?.length ? ` ${response.reasons.join(' | ')}` : '';
        throw new Error((response.error || 'Failed to grade transcript') + reasonSuffix);
      }

      const result = adaptV2ToGraderResult(response.data);
      
      toast.success(`Grade complete: ${result.score}/100`, { id: 'grading' });
      
      await logAction({
        actionType: ActionTypes.GRADE_GENERATED,
        description: `Grade generated: ${result.score}/100, Outcome: ${result.outcome}`,
        metadata: { score: result.score, outcome: result.outcome },
        sessionId,
      });

      // Save coaching analysis
      await saveCoachingAnalysis({
        sessionId,
        coachName,
        clientName: clientName || 'Unknown',
        callDate: callDate || new Date().toISOString().slice(0, 10),
        grade: {
          score: result.score,
          outcome: result.outcome,
          summary: result.summary,
          phaseScores: response.data.phaseScores,
          strengths: result.strengths,
          improvements: result.improvements,
          redFlags: result.redFlags,
          transcript,
          deidentifiedTranscript: response.data.storage?.redactedTranscript || '',
          gradingVersion: 'v2',
          deterministic: response.data.deterministic,
          criticalBehaviors: response.data.criticalBehaviors,
          confidence: response.data.confidence?.score,
          qualityGate: response.data.qualityGate,
          evidence: {
            phases: response.data.phaseScores,
            criticalBehaviors: response.data.criticalBehaviors,
          },
          transcriptHash: response.data.storage?.transcriptHash,
        },
      });

      onSuccess(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to grade transcript';
      setError(errorMessage);
      toast.error(errorMessage, { id: 'grading' });
      onError?.(errorMessage);
      console.error(err);
    } finally {
      window.clearInterval(timer);
      setIsGrading(false);
      setGradingElapsed(0);
      setGradingStageIndex(0);
    }
  }, [sessionId, validateTranscript, getTranscriptStats, checkTranscriptQuality]);

  return {
    isGrading,
    error,
    gradingElapsed,
    gradingStageIndex,
    reset,
    validateTranscript,
    getTranscriptStats,
    handleFileUpload,
    gradeTranscript,
  };
}

// Helper function to adapt V2 API response to GraderResultData
function adaptV2ToGraderResult(v2: SalesGradeV2Response): GraderResultData {
  const phaseScores = Object.entries(v2.phaseScores || {}).map(([id, phase]: [string, any]) => ({
    name: phase.name || id,
    score: phase.score || 0,
    maxScore: 100,
    summary: phase.summary,
    evidence: phase.evidence,
    weight: phase.weight,
  }));

  const redFlags = Object.entries(v2.criticalBehaviors || {})
    .filter(([, value]: [string, any]) => value && value.status === 'fail')
    .map(([key]) => key);

  const criticalBehaviors = Object.entries(v2.criticalBehaviors || {}).map(([id, cb]: [string, any]) => ({
    id,
    name: getBehaviorName(id),
    status: cb.status,
    note: cb.note,
    evidence: cb.evidence,
  }));

  return {
    score: v2.deterministic?.overallScore || 0,
    outcome: mapOutcome(v2.metadata?.outcome),
    summary: `${v2.highlights?.topStrength || ''} ${v2.highlights?.topImprovement || ''}`.trim(),
    phaseScores,
    strengths: [v2.highlights?.topStrength].filter(Boolean) as string[],
    improvements: [v2.highlights?.topImprovement].filter(Boolean) as string[],
    redFlags,
    criticalBehaviors,
    deterministic: v2.deterministic ? {
      weightedPhaseScore: v2.deterministic.weightedPhaseScore,
      penaltyPoints: v2.deterministic.penaltyPoints,
      unknownPenalty: v2.deterministic.unknownPenalty,
      overallScore: v2.deterministic.overallScore,
    } : undefined,
    confidence: v2.confidence ? {
      score: v2.confidence.score,
      evidenceCoverage: v2.confidence.evidenceCoverage || 0,
      quoteVerificationRate: v2.confidence.quoteVerificationRate || 0,
      transcriptQuality: v2.confidence.transcriptQuality || 0,
    } : undefined,
    prospectSummary: v2.highlights?.prospectSummary,
    evidence: {
      phases: v2.phaseScores || {},
      criticalBehaviors: v2.criticalBehaviors || {},
    },
    qualityGate: v2.qualityGate,
    storage: v2.storage,
  };
}

function mapOutcome(outcome?: string): string {
  if (outcome === 'Won') return 'BOOKED';
  if (outcome === 'Lost') return 'NOT BOOKED';
  return 'UNKNOWN';
}

function getBehaviorName(id: string): string {
  const names: Record<string, string> = {
    free_consulting: 'No Free Consulting',
    discount_discipline: 'Discount Discipline',
    emotional_depth: 'Emotional Depth',
    time_management: 'Time Management',
    personal_story: 'Story Deployment',
  };
  return names[id] || id;
}
