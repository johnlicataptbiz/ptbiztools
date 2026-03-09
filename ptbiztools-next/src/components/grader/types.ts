// Shared types for the unified grader system

export interface GraderInputData {
  transcript: string;
  coachName: string;
  clientName: string;
  callDate: string;
  outcome?: string;
  program?: string;
  prospectName?: string;
  metadata?: Record<string, any>;
}

export interface PhaseScore {
  name: string;
  score: number;
  maxScore: number;
  summary?: string;
  evidence?: string[];
  weight?: number;
}

export interface CriticalBehavior {
  id: string;
  name: string;
  status: string;
  note: string;
  evidence?: string[];
}

export interface DeterministicScore {
  weightedPhaseScore: number;
  penaltyPoints: number;
  unknownPenalty: number;
  overallScore: number;
}

export interface ConfidenceMetrics {
  score: number;
  evidenceCoverage: number;
  quoteVerificationRate: number;
  transcriptQuality: number;
}

export interface GraderResultData {
  score: number;
  outcome: string;
  summary: string;
  phaseScores: PhaseScore[];
  strengths: string[];
  improvements: string[];
  redFlags: string[];
  criticalBehaviors?: CriticalBehavior[];
  deterministic?: DeterministicScore;
  confidence?: ConfidenceMetrics;
  prospectSummary?: string;
  evidence?: {
    phases: Record<string, any>;
    criticalBehaviors: Record<string, any>;
  };
  qualityGate?: {
    accepted: boolean;
    reasons?: string[];
  };
  storage?: {
    redactedTranscript?: string;
    transcriptHash?: string;
  };
}

export interface GraderModalProps {
  isOpen: boolean;
  onClose: () => void;
  badgeSrc: string;
  badgeAlt: string;
  title: string;
  subtitle: string;
}

export interface GraderInputModalProps extends GraderModalProps {
  onSubmit: (data: GraderInputData) => void;
  isGrading: boolean;
  minWords?: number;
  defaultValues?: Partial<GraderInputData>;
  showProgram?: boolean;
  showOutcome?: boolean;
  programs?: string[];
  outcomes?: string[];
}

export interface GraderResultsModalProps extends GraderModalProps {
  result: GraderResultData;
  inputData: GraderInputData;
  onGeneratePDF: () => void;
  onViewHistory: () => void;
}

export interface UploadedFile {
  name: string;
  type: string;
  text: string;
}

export interface TranscriptStats {
  wordCount: number;
  charCount: number;
  lineCount: number;
  questionCount: number;
  estimatedMinutes: number;
}
