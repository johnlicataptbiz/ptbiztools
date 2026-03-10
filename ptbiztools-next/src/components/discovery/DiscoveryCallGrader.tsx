"use client";

import { useMemo, useRef, useState, useEffect, useCallback, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Upload,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import type { GradeResult } from "@/utils/grader";
import type { GraderResultData } from "@/components/grader/types";
import { generatePDF } from "@/utils/pdfGenerator";
import {
  logAction,
  ActionTypes,
  extractTranscriptFromFile,
  saveCoachingAnalysis,
  savePdfExport,
  gradeDannySalesCallV2,
  type SalesGradeV2Response,
} from "@/lib/ptbiz-api";
import { GradePreview } from "@/components/grader/GradePreview";
import { GradeModal } from "@/components/grader/GradeModal";
import { TOOL_BADGES } from "@/constants/tool-badges";

const MIN_WORDS = 120

// Danny's Phase Definitions with Rubric
const PHASES = [
  {
    id: "opening", name: "Opening & Rapport", maxPoints: 10,
    great: ["Warm, confident greeting with the patient's name", "If referred: acknowledge the referral, express genuine interest", "Light rapport building that feels natural", "Energy is high but not forced"],
    mistakes: ["Jumping straight into clinical questions without rapport", "Sounding scripted or robotic", "Over-rapport: 5+ minutes of small talk", "Excessive filler words"],
  },
  {
    id: "setScene", name: "Set the Scene / Take Control", maxPoints: 10,
    great: ["Clearly sets agenda for the call", "Gets verbal agreement to proceed", "Asks how they found the clinic", "Clinician is leading, not following"],
    mistakes: ["Never setting an agenda", "Letting patient dictate the flow", "Handing control to the patient", "Answering insurance question before building value"],
  },
  {
    id: "discoveryCurrentState", name: "Discovery: Current State", maxPoints: 15,
    great: ["Asks about current situation, duration, what they have tried", "Gets specific about limitations and day-to-day impact", "Asks about previous treatment experiences", "Quantifies where possible: pain level, frequency, activity levels"],
    mistakes: ["Staying at surface level then immediately pitching", "Only asking clinical questions, no functional impact", "Not asking why now or what made them reach out", "Getting too clinical/diagnostic instead of listening"],
  },
  {
    id: "discoveryGoals", name: "Discovery: Goals & Why", maxPoints: 15,
    great: ["Asks what the ideal outcome looks like (magic wand question)", "Gets specific goals, not vague", "Asks WHY the goal matters, uncovers deeper motivation", "Asks about cost of inaction"],
    mistakes: ["Never asking about goals, jumping from symptoms to pitch", "Accepting vague goals without digging deeper", "Missing the emotional layer entirely", "Not asking why now, the trigger that made them reach out"],
    callout: "This phase is the most commonly underdone. The emotional motivation is what makes the price feel worth it later.",
  },
  {
    id: "valuePresentation", name: "Value Presentation", maxPoints: 20,
    great: ["Summarizes what they heard before pitching", "Connects clinic approach to THEIR specific situation", "Differentiates from insurance PT with specifics", "Frames outcome, not just process", "Expresses genuine confidence they can help"],
    mistakes: ["Generic pitch not referencing anything the patient said", "Never summarizing/reflecting what they heard", "Leading with price before building value", "Weak differentiation from insurance PT", "No confidence statement"],
  },
  {
    id: "objectionHandling", name: "Objection Handling", maxPoints: 15,
    great: ["Acknowledge: Validate the concern genuinely", "Associate: Connect to positive behavior of successful patients", "Ask: Ask a question about their concern to stay in control", "Reframes insurance question with value-first approach", "Explores payment options (HSA/FSA, payment plans, superbills)"],
    mistakes: ["Giving up after the first objection", "Answering objections with a monologue instead of questions", "Referring the patient to a competitor", "Getting defensive about pricing"],
  },
  {
    id: "close", name: "The Close", maxPoints: 15,
    great: ["Assumptive close with specific time options", "Offers specific times, not open-ended scheduling", "Ties close back to their specific goals", "Handles logistics confidently", "Preframes continuity and follow-up scheduling"],
    mistakes: ["Never asking for the booking", "Closing transactionally without tying back to goals", "Not scheduling follow-ups beyond the eval", "Ending passively instead of booking"],
  },
];

const RED_FLAGS = [
  { id: "rf1", label: "Referred patient to a competitor", deduction: -15, desc: "Actively sends a qualified lead away" },
  { id: "rf2", label: "Diagnosed on the phone (not clinical framing)", deduction: -10, desc: "Named specific conditions / prescribed treatment" },
  { id: "rf3", label: "Led with price before building value", deduction: -10, desc: "Patient had no context to evaluate worth" },
  { id: "rf4", label: "Asked Do you have any questions?", deduction: -5, desc: "Hands control to the patient" },
  { id: "rf5", label: "Never attempted to close", deduction: -10, desc: "Not trying to book is a missed opportunity" },
  { id: "rf6", label: "Validated the competition", deduction: -10, desc: "Said something positive about a competitor" },
  { id: "rf7", label: "Failed to redirect early insurance question", deduction: -5, desc: "Answered insurance question before building value" },
];

const OUTCOMES = ["BOOKED", "NOT BOOKED", "UNKNOWN"];

const DISCOVERY_GRADING_STAGES = [
  {
    title: "Parsing transcript structure",
    detail: "Separating discovery and close segments for cleaner phase scoring.",
  },
  {
    title: "Running deterministic framework",
    detail: "Applying weighted phase rules and critical behavior penalties.",
  },
  {
    title: "Verifying evidence quality",
    detail: "Confirming transcript quotes and consistency before final score.",
  },
  {
    title: "Saving analysis records",
    detail: "Writing this run to your analyses dashboard and export history.",
  },
] as const

const LEGACY_PHASE_MAP = [
  { id: 'connection', name: 'Opening & Rapport' },
  { id: 'discovery', name: 'Discovery — Current State' },
  { id: 'gap_creation', name: 'Discovery — Goals & Why' },
  { id: 'solution', name: 'Value Presentation' },
  { id: 'temp_check', name: 'Objection Handling' },
  { id: 'close', name: 'The Close' },
  { id: 'followup', name: 'Follow-up / Wrap' },
] as const

function mapOutcome(outcome?: string): GradeResult['outcome'] {
  if (outcome === 'Won') return 'BOOKED'
  if (outcome === 'Lost') return 'NOT BOOKED'
  return 'UNKNOWN'
}

function adaptV2ToGradeResult(v2: SalesGradeV2Response): GradeResult {
  const phaseScores = LEGACY_PHASE_MAP.map((phase) => ({
    name: phase.name,
    score: v2.phaseScores[phase.id].score,
    maxScore: 100,
    summary: v2.phaseScores[phase.id].summary,
    evidence: v2.phaseScores[phase.id].evidence,
  }))
  const redFlags = Object.entries(v2.criticalBehaviors)
    .filter(([, value]) => value.status === 'fail')
    .map(([key]) => key)

  // Map critical behaviors
  const criticalBehaviors = Object.entries(v2.criticalBehaviors).map(([id, cb]) => ({
    id,
    name: getBehaviorName(id),
    status: cb.status,
    note: cb.note,
    evidence: cb.evidence,
  }))

  return {
    score: v2.deterministic.overallScore,
    outcome: mapOutcome(v2.metadata.outcome),
    summary: `Deterministic score ${v2.deterministic.overallScore}/100. Confidence ${v2.confidence.score}/100.`,
    phaseScores,
    strengths: [v2.highlights.topStrength].filter(Boolean),
    improvements: [v2.highlights.topImprovement].filter(Boolean),
    redFlags,
    deidentifiedTranscript: v2.storage?.redactedTranscript || '',
    // Extended data from v2 API
    criticalBehaviors,
    deterministic: {
      weightedPhaseScore: v2.deterministic.weightedPhaseScore,
      penaltyPoints: v2.deterministic.penaltyPoints,
      unknownPenalty: v2.deterministic.unknownPenalty,
      overallScore: v2.deterministic.overallScore,
    },
    confidence: {
      score: v2.confidence.score,
      evidenceCoverage: v2.confidence.evidenceCoverage,
      quoteVerificationRate: v2.confidence.quoteVerificationRate,
      transcriptQuality: v2.confidence.transcriptQuality,
    },
    prospectSummary: v2.highlights.prospectSummary,
    evidence: {
      phases: v2.phaseScores as unknown as Record<string, import('@/utils/grader').PhaseScore>,
      criticalBehaviors: v2.criticalBehaviors as unknown as Record<string, import('@/utils/grader').CriticalBehavior>,
    },
  }
}

function getBehaviorName(id: string): string {
  const names: Record<string, string> = {
    free_consulting: 'No Free Consulting',
    discount_discipline: 'Discount Discipline',
    emotional_depth: 'Emotional Depth',
    time_management: 'Time Management',
    personal_story: 'Story Deployment',
  }
  return names[id] || id
}

// Adapter to convert legacy GradeResult to new GraderResultData format
function adaptLegacyGradeToResult(grade: GradeResult): GraderResultData {
  const extendedGrade = grade as GradeResult & Pick<GraderResultData, "qualityGate" | "storage">;

  return {
    score: grade.score,
    outcome: grade.outcome,
    summary: grade.summary,
    phaseScores: grade.phaseScores.map(p => ({
      name: p.name,
      score: p.score,
      maxScore: p.maxScore,
      summary: p.summary,
      evidence: p.evidence,
    })),
    strengths: grade.strengths,
    improvements: grade.improvements,
    redFlags: grade.redFlags,
    criticalBehaviors: grade.criticalBehaviors?.map(cb => ({
      id: cb.id,
      name: cb.name,
      status: cb.status,
      note: cb.note,
      evidence: cb.evidence,
    })),
    deterministic: grade.deterministic,
    confidence: grade.confidence,
    prospectSummary: grade.prospectSummary,
    evidence: grade.evidence,
    qualityGate: extendedGrade.qualityGate,
    storage: extendedGrade.storage,
  }
}

function shouldRetryGrading(response: { error?: string; reasons?: string[] }) {
  const errorText = (response.error || '').toLowerCase()
  const reasons = (response.reasons || []).map((reason) => reason.toLowerCase())
  return (
    errorText.includes('model extraction schema validation failed') ||
    errorText.includes('quality gate rejected extraction') ||
    reasons.some((reason) => reason.includes('evidence'))
  )
}

const transcriptTemplate = `Clinician: Thanks for taking the call. What made you reach out now?
Prospect: I have chronic back pain and want to get back to lifting.
Clinician: Got it. What have you already tried, and what is still not working?
Prospect: PT at a chain clinic helped a little but the pain keeps returning.
`

function sourceTypeLabel(sourceType?: "pdf" | "text" | "csv" | "rtf" | "xlsx" | "image") {
  if (!sourceType) return "file";
  if (sourceType === "pdf") return "PDF";
  if (sourceType === "xlsx") return "spreadsheet";
  if (sourceType === "image") return "image OCR";
  if (sourceType === "rtf") return "RTF";
  if (sourceType === "csv") return "CSV";
  return "text";
}

// Danny's UI Helpers
function sc(score: number) {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

function sl(score: number) {
  if (score >= 90) return "Exceptional";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Decent";
  if (score >= 60) return "Needs Work";
  return "Significant Issues";
}

function getTranscriptStats(value: string) {
  const trimmed = value.trim()
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : []

  return {
    wordCount: words.length,
    charCount: value.length,
    lineCount: trimmed ? trimmed.split(/\n+/).length : 0,
    questionCount: (value.match(/\?/g) || []).length,
    clinicianMentions: (value.match(/\b(clinician|coach|therapist|pt|doctor)\b/gi) || []).length,
    prospectMentions: (value.match(/\b(prospect|patient|client)\b/gi) || []).length,
    estimatedMinutes: words.length > 0 ? Math.max(1, Math.round(words.length / 145)) : 0,
  }
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Phase Card Component
function PhaseCard({ 
  phase, 
  score, 
  notes, 
  onScore, 
  onNotes, 
  isOpen, 
  onToggle 
}: { 
  phase: typeof PHASES[0]; 
  score: number; 
  notes: string; 
  onScore: (id: string, val: number) => void; 
  onNotes: (id: string, val: string) => void; 
  isOpen: boolean; 
  onToggle: (id: string) => void;
}) {
  const pct = phase.maxPoints > 0 ? (score / phase.maxPoints) * 100 : 0;
  const color = sc(pct);
  
  return (
    <div className="phase-card">
      <div className="phase-card-header">
        <h3 className="phase-card-title">{phase.name}</h3>
        <button 
          onClick={() => onToggle(phase.id)} 
          className="phase-card-toggle"
        >
          {isOpen ? "Hide Rubric" : "Show Rubric"}
          <ChevronDown className={`phase-card-chevron ${isOpen ? 'open' : ''}`} size={16} />
        </button>
      </div>
      
      <div className="phase-card-score-row">
        <input 
          type="range" 
          min={0} 
          max={phase.maxPoints} 
          step={1} 
          value={score}
          onChange={(e) => onScore(phase.id, parseInt(e.target.value))}
          className="phase-card-slider"
          style={{ accentColor: color }}
        />
        <span className="phase-card-score" style={{ color }}>
          {score}<span className="phase-card-max">/{phase.maxPoints}</span>
        </span>
      </div>
      
      {isOpen && (
        <div className="phase-card-rubric">
          <div className="rubric-section rubric-great">
            <p className="rubric-title">What great looks like</p>
            {phase.great.map((t, i) => (
              <div key={i} className="rubric-item rubric-item-great">
                <CheckCircle size={14} /> {t}
              </div>
            ))}
          </div>
          <div className="rubric-section rubric-mistakes">
            <p className="rubric-title">Common mistakes</p>
            {phase.mistakes.map((t, i) => (
              <div key={i} className="rubric-item rubric-item-mistake">
                <XCircle size={14} /> {t}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {phase.callout && isOpen && (
        <div className="phase-card-callout">
          <AlertCircle size={16} />
          <p>{phase.callout}</p>
        </div>
      )}
      
      <textarea 
        value={notes} 
        onChange={(e) => onNotes(phase.id, e.target.value)}
        placeholder="Add coaching notes..."
        rows={2}
        className="phase-card-notes"
      />
    </div>
  );
}

// Red Flags Panel Component
function RedFlagsPanel({ 
  flags, 
  onToggle 
}: { 
  flags: string[]; 
  onToggle: (id: string) => void;
}) {
  const totalDeduction = flags.reduce((sum, id) => {
    const f = RED_FLAGS.find(x => x.id === id);
    return sum + (f ? f.deduction : 0);
  }, 0);

  return (
    <div className="redflags-panel">
      <h2 className="redflags-title">Red Flags</h2>
      <p className="redflags-subtitle">Check any critical errors. Deductions subtract from total.</p>
      
      {RED_FLAGS.map((f) => {
        const isOn = flags.includes(f.id);
        return (
          <div 
            key={f.id} 
            onClick={() => onToggle(f.id)}
            className={`redflag-item ${isOn ? 'active' : ''}`}
          >
            <input 
              type="checkbox" 
              checked={isOn} 
              readOnly 
              className="redflag-checkbox"
            />
            <div className="redflag-content">
              <span className="redflag-label">{f.label}</span>
              <span className={`redflag-deduction ${isOn ? 'active' : ''}`}>
                {f.deduction}
              </span>
              <p className="redflag-desc">{f.desc}</p>
            </div>
          </div>
        );
      })}
      
      {flags.length > 0 && (
        <div className="redflags-total">
          <span>Total Red Flag Deductions</span>
          <span className="redflags-total-amount">{totalDeduction}</span>
        </div>
      )}
    </div>
  );
}

// Summary View Component
function SummaryView({ 
  scores, 
  flags, 
  total, 
  meta, 
  strengths, 
  improvements, 
  flagNotes,
  onGenerateReport
}: { 
  scores: Record<string, number>;
  flags: string[];
  total: number;
  meta: { coachName: string; clientName: string; callDate: string; outcome: string };
  strengths: string;
  improvements: string;
  flagNotes: string;
  onGenerateReport: () => void;
}) {
  return (
    <div className="summary-view">
      <div className="summary-header">
        <h2>Grade Summary</h2>
        <button onClick={onGenerateReport} className="btn btn-primary">
          <Download size={16} />
          Generate PDF Report
        </button>
      </div>
      
      <div className="summary-meta">
        {[meta.clientName, meta.callDate, meta.outcome].filter(Boolean).join(" • ")}
      </div>
      
      <div className="summary-score-section">
        <div 
          className="summary-score-badge"
          style={{ background: sc(total) }}
        >
          <div className="summary-score-value">{total}</div>
          <div className="summary-score-max">/ 100</div>
          <div className="summary-score-label">{sl(total)}</div>
        </div>
        
        <div className="summary-phases">
          {PHASES.map((ph) => {
            const s = scores[ph.id] || 0;
            const p = (s / ph.maxPoints) * 100;
            return (
              <div key={ph.id} className="summary-phase-row">
                <span className="summary-phase-name">{ph.name}</span>
                <div className="summary-phase-bar">
                  <div 
                    className="summary-phase-fill"
                    style={{ width: `${p}%`, background: sc(p) }}
                  />
                </div>
                <span className="summary-phase-score">{s}/{ph.maxPoints}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {flags.length > 0 && (
        <div className="summary-redflags">
          <p className="summary-redflags-title">Red Flag Deductions</p>
          {flags.map((id) => {
            const f = RED_FLAGS.find(x => x.id === id);
            return f ? (
              <div key={id} className="summary-redflag-row">
                <span>{f.label}</span>
                <span className="summary-redflag-deduction">{f.deduction}</span>
              </div>
            ) : null;
          })}
        </div>
      )}
      
      {strengths && (
        <div className="summary-section">
          <h4 className="summary-section-title success">What&apos;s Working Well</h4>
          <p className="summary-section-content">{strengths}</p>
        </div>
      )}
      
      {improvements && (
        <div className="summary-section">
          <h4 className="summary-section-title warning">What Needs Work</h4>
          <p className="summary-section-content">{improvements}</p>
        </div>
      )}
      
      {flagNotes && (
        <div className="summary-section">
          <h4 className="summary-section-title danger">Red Flag Notes</h4>
          <p className="summary-section-content">{flagNotes}</p>
        </div>
      )}
    </div>
  );
}

export default function DiscoveryCallGrader() {
  // Original state
  const [transcript, setTranscript] = useState('')
  const [grade, setGrade] = useState<GradeResult | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [clientName, setClientName] = useState('')
  const [callDate, setCallDate] = useState('')
  const [analysisId, setAnalysisId] = useState<string | undefined>(undefined)
  const [gradingElapsed, setGradingElapsed] = useState(0)
  const [gradingStageIndex, setGradingStageIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sessionId] = useState(() => crypto.randomUUID())

  // Danny's UI state
  const [activeTab, setActiveTab] = useState<'grading' | 'feedback' | 'summary'>('grading')
  const [scores, setScores] = useState(() => Object.fromEntries(PHASES.map((p) => [p.id, 0])))
  const [phaseNotes, setPhaseNotes] = useState(() => Object.fromEntries(PHASES.map((p) => [p.id, ""])))
  const [flags, setFlags] = useState<string[]>([])
  const [openPhase, setOpenPhase] = useState<string | null>(null)
  const [strengths, setStrengths] = useState("")
  const [improvements, setImprovements] = useState("")
  const [flagNotes, setFlagNotes] = useState("")
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const stats = useMemo(() => getTranscriptStats(transcript), [transcript])

  const checklist = useMemo(
    () => [
      { label: `Transcript has at least ${MIN_WORDS} words`, ok: stats.wordCount >= MIN_WORDS },
      { label: 'Evidence quotes will be required for each scoring phase', ok: stats.wordCount >= MIN_WORDS },
      { label: 'Coach and client names are set', ok: coachName.trim().length > 0 && clientName.trim().length > 0 },
      { label: 'Call date is set', ok: callDate.trim().length > 0 },
    ],
    [callDate, clientName, coachName, stats.wordCount],
  )

  const completedChecklist = checklist.filter((item) => item.ok).length
  const canGrade = stats.wordCount >= MIN_WORDS
  const gradingPulseDots = ".".repeat((gradingElapsed % 3) + 1)
  const gradingProgressPct = Math.min(96, 16 + gradingElapsed * 8)
  const activeStage = DISCOVERY_GRADING_STAGES[gradingStageIndex]

  useEffect(() => {
    void logAction({
      actionType: ActionTypes.SESSION_STARTED,
      description: 'User started a new grading session',
      sessionId,
    })
  }, [sessionId])

  useEffect(() => {
    if (!isGrading) {
      setGradingElapsed(0)
      setGradingStageIndex(0)
      return
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      setGradingElapsed(elapsed)
      setGradingStageIndex(Math.min(DISCOVERY_GRADING_STAGES.length - 1, Math.floor(elapsed / 3)))
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [isGrading])

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const extracted = await extractTranscriptFromFile(file)
      if (extracted.error || !extracted.text) {
        toast.error(extracted.error || 'Could not read transcript file')
        return
      }

      setTranscript(extracted.text)
      toast.success(`Loaded transcript from ${file.name} (${sourceTypeLabel(extracted.sourceType)})`)
    } catch (error) {
      console.error(error)
      toast.error('Could not read transcript file. Use PDF, TXT, MD, CSV, JSON, RTF, XLSX, PNG, JPG, or WEBP.')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleInsertTemplate = () => {
    if (!transcript.trim()) {
      setTranscript(transcriptTemplate)
    } else {
      setTranscript((prev) => `${prev.trimEnd()}\n\n${transcriptTemplate}`)
    }
    toast.success('Template inserted')
  }

  const handleGrade = async () => {
    if (!transcript.trim()) {
      toast.error('Please paste or upload a transcript first')
      return
    }

    if (stats.wordCount < MIN_WORDS) {
      toast.error(`Transcript is too short. Add at least ${MIN_WORDS} words.`)
      return
    }

    // Diagnostic: Check for close section in transcript
    const closeSectionIndicators = ['close', 'book', 'schedule', 'appointment', 'next step', 'follow up', 'investment', 'price', 'cost', 'payment'];
    const hasCloseSection = closeSectionIndicators.some(indicator => 
      transcript.toLowerCase().includes(indicator)
    );
    
    // Check for end-of-call indicators
    const endIndicators = ['goodbye', 'bye', 'thank you', 'thanks', 'have a great', 'talk soon', 'see you'];
    const hasEndIndicator = endIndicators.some(indicator => 
      transcript.toLowerCase().includes(indicator)
    );

    console.log('[DiscoveryCallGrader] Transcript diagnostics:', {
      charCount: transcript.length,
      wordCount: stats.wordCount,
      lineCount: stats.lineCount,
      hasCloseSection,
      hasEndIndicator,
      last200Chars: transcript.slice(-200),
    });

    // Warning for very long transcripts that might hit token limits
    const ESTIMATED_TOKENS_PER_WORD = 1.3;
    const estimatedTokens = stats.wordCount * ESTIMATED_TOKENS_PER_WORD;
    const MAX_SAFE_TOKENS = 12000; // Leave room for system prompt and response
    
    if (estimatedTokens > MAX_SAFE_TOKENS) {
      toast.warning(`Transcript is very long (~${Math.round(estimatedTokens)} tokens). This may cause truncation. Consider focusing on the most relevant sections.`, {
        duration: 8000,
        id: 'long-transcript-warning',
      });
    }

    setIsGrading(true)
    toast.loading('Grading transcript...', { id: 'grading' })

    await logAction({
      actionType: ActionTypes.TRANSCRIPT_PASTED,
      description: 'Transcript prepared for grading',
      metadata: {
        transcriptLength: transcript.length,
        transcriptWordCount: stats.wordCount,
        estimatedTokens: Math.round(estimatedTokens),
        hasCloseSection,
        hasEndIndicator,
      },
      sessionId,
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      // Ensure we're sending the COMPLETE transcript - no truncation
      const payload = {
        transcript, // Full transcript - never sliced
        program: 'Rainmaker',
        closer: coachName.trim() || 'Unknown',
        prospectName: clientName.trim() || undefined,
        // Add metadata to help backend processing
        metadata: {
          originalLength: transcript.length,
          wordCount: stats.wordCount,
          hasCloseSection,
          hasEndIndicator,
          clientTimestamp: new Date().toISOString(),
        }
      } as const

      let response = await gradeDannySalesCallV2(payload)
      if ((response.error || !response.data) && shouldRetryGrading(response)) {
        response = await gradeDannySalesCallV2(payload)
      }

      if (response.error || !response.data) {
        const reasonSuffix = response.reasons?.length ? ` ${response.reasons.join(' | ')}` : ''
        throw new Error((response.error || 'Failed to grade transcript') + reasonSuffix)
      }

      const result = adaptV2ToGradeResult(response.data)
      setGrade(result)
      setIsModalOpen(true)
      toast.success(`Grade complete: ${result.score}/100`, { id: 'grading' })

      await logAction({
        actionType: ActionTypes.GRADE_GENERATED,
        description: `Grade generated: ${result.score}/100, Outcome: ${result.outcome}`,
        metadata: { score: result.score, outcome: result.outcome },
        sessionId,
      })

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
          deidentifiedTranscript: response.data.storage?.redactedTranscript || result.deidentifiedTranscript,
          gradingVersion: 'v2',
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
      })

      if (saved.analysisId) {
        setAnalysisId(saved.analysisId)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to grade transcript'
      toast.error(errorMessage, { id: 'grading' })
      console.error(error)
    } finally {
      setIsGrading(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!grade) return

    try {
      toast.loading('Generating PDF...', { id: 'pdf' })
      await generatePDF(grade, coachName, clientName || 'Client', callDate || new Date().toLocaleDateString())

      toast.success('PDF downloaded!', { id: 'pdf' })

      await logAction({
        actionType: ActionTypes.PDF_GENERATED,
        description: `PDF generated: ${grade.score}/100 for ${clientName || 'Client'}`,
        metadata: { score: grade.score, clientName: clientName || 'Client' },
        sessionId,
      })

      await savePdfExport({
        sessionId,
        coachingAnalysisId: analysisId,
        coachName,
        clientName: clientName || 'Client',
        callDate: callDate || new Date().toLocaleDateString(),
        score: grade.score,
        metadata: {
          tool: 'discovery_call_grader',
          outcome: grade.outcome,
          summary: grade.summary,
        },
      })
    } catch (error) {
      toast.error('Failed to generate PDF', { id: 'pdf' })
      console.error('Failed to generate PDF:', error)
    }
  }

  // Calculate totals for Danny's UI
  const baseScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const deductions = flags.reduce((sum, id) => {
    const f = RED_FLAGS.find(x => x.id === id)
    return sum + (f ? f.deduction : 0)
  }, 0)
  const totalScore = Math.max(0, baseScore + deductions)

  // Handlers for Danny's UI
  const onScore = useCallback((id: string, val: number) => {
    setScores(p => ({ ...p, [id]: val }))
  }, [])

  const onNotes = useCallback((id: string, val: string) => {
    setPhaseNotes(p => ({ ...p, [id]: val }))
  }, [])

  const onToggleFlag = useCallback((id: string) => {
    setFlags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const handleReset = () => {
    setScores(Object.fromEntries(PHASES.map(p => [p.id, 0])))
    setPhaseNotes(Object.fromEntries(PHASES.map(p => [p.id, ""])))
    setFlags([])
    setStrengths("")
    setImprovements("")
    setFlagNotes("")
    setOpenPhase(null)
    setShowResetConfirm(false)
  }

  return (
    <div className="grader-page">
      <div className="container tool-page">
        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", marginBottom: "24px" }}
        >
          <h1 className="tool-page-title" style={{ margin: "0 0 8px 0", fontSize: "28px" }}>
            Discovery Call Grader
          </h1>
          <p className="tool-page-subtitle" style={{ margin: 0, fontSize: "15px" }}>
            Score calls against the 7-phase framework. Track coach performance over time.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="grader-tabs">
          {[
            { id: 'grading', label: 'Grading' },
            { id: 'feedback', label: 'Feedback' },
            { id: 'summary', label: 'Summary' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`grader-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <motion.div
          className="grader-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* GRADING TAB */}
          {activeTab === 'grading' && (
            <div className="grader-workbench">
              <section className="grader-main-pane">
                {/* Transcript Upload Section */}
                <div className="form-group">
                  <label>Call Transcript</label>
                  <div className="grader-intake-toolbar" style={{ marginBottom: '12px' }}>
                    <button className="btn btn-secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={16} />
                      Upload Transcript
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={handleInsertTemplate}>
                      <FileText size={16} />
                      Insert Template
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.csv,.json,.rtf,.pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.docx,.doc"
                      className="grader-file-input"
                      onChange={handleFileUpload}
                    />
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste the full transcript or upload a text file..."
                    rows={6}
                  />
                  <div className="textarea-hint">
                    The transcript is automatically de-identified before grading. Minimum {MIN_WORDS} words required.
                  </div>
                </div>

                {/* Grade Button */}
                <div className="form-actions">
                  {!showResetConfirm ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowResetConfirm(true)}
                      disabled={!transcript && totalScore === 0}
                    >
                      <RotateCcw size={16} />
                      Reset
                    </button>
                  ) : (
                    <div className="reset-confirm">
                      <button className="reset-confirm-btn confirm" onClick={handleReset}>
                        Confirm
                      </button>
                      <button className="reset-confirm-btn cancel" onClick={() => setShowResetConfirm(false)}>
                        Cancel
                      </button>
                    </div>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={handleGrade}
                    disabled={!canGrade || isGrading}
                  >
                    {isGrading ? (
                      <>
                        <span className="spinner"></span>
                        Grading...
                      </>
                    ) : (
                      <>
                        Grade with AI
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>

                {isGrading && (
                  <div className="grading-progress-card" role="status" aria-live="polite">
                    <div className="grading-progress-head">
                      <span className="grading-progress-status">Live Analysis{gradingPulseDots}</span>
                      <span className="grading-progress-time">{formatElapsed(gradingElapsed)}</span>
                    </div>
                    <div className="grading-progress-title">{activeStage.title}</div>
                    <p className="grading-progress-detail">{activeStage.detail}</p>
                    <div className="grading-progress-track">
                      <div className="grading-progress-fill" style={{ width: `${gradingProgressPct}%` }} />
                    </div>
                  </div>
                )}

                {/* Call Details */}
                <div style={{ marginTop: '24px', padding: '20px', background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Call Details</h3>
                  <div className="grader-meta-grid">
                    <div className="form-group compact">
                      <input
                        type="text"
                        value={coachName}
                        onChange={(e) => setCoachName(e.target.value)}
                        placeholder="Coach name"
                      />
                    </div>
                    <div className="form-group compact">
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Client name"
                      />
                    </div>
                    <div className="form-group compact">
                      <input
                        type="date"
                        value={callDate}
                        onChange={(e) => setCallDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    {OUTCOMES.map(o => {
                      const active = grade?.outcome === o || (o === 'BOOKED' && grade?.outcome === 'BOOKED')
                      return (
                        <button
                          key={o}
                          onClick={() => {/* Toggle outcome */}}
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '12px',
                            fontWeight: 500,
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            background: active ? 'var(--color-accent)' : 'var(--color-card)',
                            color: active ? 'white' : 'var(--color-text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {o}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Phase Cards */}
                <div style={{ marginTop: '24px' }}>
                  {PHASES.map(p => (
                    <PhaseCard
                      key={p.id}
                      phase={p}
                      score={scores[p.id]}
                      notes={phaseNotes[p.id]}
                      onScore={onScore}
                      onNotes={onNotes}
                      isOpen={openPhase === p.id}
                      onToggle={(id) => setOpenPhase(openPhase === id ? null : id)}
                    />
                  ))}
                </div>

                {/* Red Flags */}
                <div style={{ marginTop: '8px' }}>
                  <RedFlagsPanel flags={flags} onToggle={onToggleFlag} />
                </div>

                {/* Score Bar */}
                <div className="score-bar" style={{ marginTop: '16px' }}>
                  <span className="score-bar-label">
                    Phase Total: <strong>{baseScore}</strong>
                    {deductions < 0 && <span style={{ color: 'var(--color-error)', marginLeft: '12px' }}>Red Flags: <strong>{deductions}</strong></span>}
                  </span>
                  <span className="score-bar-value" style={{ color: sc(totalScore) }}>
                    {totalScore}/100 — {sl(totalScore)}
                  </span>
                </div>
              </section>

              <aside className="grader-side-pane">
                <div className="grader-side-card">
                  <h3><BarChart3 size={16} /> Live Diagnostics</h3>
                  <div className="diag-grid">
                    <div className="diag-item">
                      <span>Words</span>
                      <strong>{stats.wordCount}</strong>
                    </div>
                    <div className="diag-item">
                      <span>Lines</span>
                      <strong>{stats.lineCount}</strong>
                    </div>
                    <div className="diag-item">
                      <span>Questions</span>
                      <strong>{stats.questionCount}</strong>
                    </div>
                    <div className="diag-item">
                      <span>Est. Minutes</span>
                      <strong>{stats.estimatedMinutes}</strong>
                    </div>
                  </div>
                </div>

                <div className="grader-side-card">
                  <h3><ClipboardCheck size={16} /> Ready Check</h3>
                  <ul className="checklist">
                    {checklist.map((item) => (
                      <li key={item.label} className={item.ok ? 'ok' : 'bad'}>
                        {item.ok ? '✓' : '•'} {item.label}
                      </li>
                    ))}
                  </ul>
                  <div className="checklist-progress">
                    {completedChecklist}/{checklist.length} complete
                  </div>
                </div>

                <div className="grader-side-card">
                  <h3><MessageSquare size={16} /> Quality Tips</h3>
                  <ul className="tips-list">
                    <li>Include full objection handling and closing segments.</li>
                    <li>Keep speaker labels consistent for cleaner diagnostics.</li>
                    <li>Add the full discovery section for highest scoring accuracy.</li>
                  </ul>
                </div>
              </aside>
            </div>
          )}

          {/* FEEDBACK TAB */}
          {activeTab === 'feedback' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div className="feedback-section">
                <h3 className="feedback-section-title success">
                  <CheckCircle size={16} />
                  What&apos;s Working Well
                </h3>
                <textarea
                  className="feedback-textarea"
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="- Natural rapport building&#10;- Strong clinical framing&#10;- Confident recommendation"
                  rows={5}
                />
              </div>

              <div className="feedback-section">
                <h3 className="feedback-section-title warning">
                  <AlertCircle size={16} />
                  What Needs Work
                </h3>
                <textarea
                  className="feedback-textarea"
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  placeholder="- Never asked about goals&#10;- Insurance explanation was reactive&#10;- No agenda set"
                  rows={5}
                />
              </div>

              {flags.length > 0 && (
                <div className="feedback-section" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <h3 className="feedback-section-title danger">
                    <XCircle size={16} />
                    Red Flag Notes
                  </h3>
                  <textarea
                    className="feedback-textarea"
                    value={flagNotes}
                    onChange={(e) => setFlagNotes(e.target.value)}
                    placeholder="Details on critical errors..."
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          {/* SUMMARY TAB */}
          {activeTab === 'summary' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <SummaryView
                scores={scores}
                flags={flags}
                total={totalScore}
                meta={{ coachName, clientName, callDate, outcome: grade?.outcome || '' }}
                strengths={strengths}
                improvements={improvements}
                flagNotes={flagNotes}
                onGenerateReport={handleGeneratePDF}
              />
            </div>
          )}
        </motion.div>

        {grade && !isModalOpen && (
          <GradePreview
            grade={grade}
            onViewFullReport={() => setIsModalOpen(true)}
          />
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && grade && (
          <GradeModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            result={adaptLegacyGradeToResult(grade)}
            badgeSrc={TOOL_BADGES.discovery}
            badgeAlt="Discovery Call Grader"
            title="Discovery Call Audit"
            subtitle="AI-powered call analysis & coaching insights"
            coachName={coachName}
            setCoachName={setCoachName}
            clientName={clientName}
            setClientName={setClientName}
            callDate={callDate}
            setCallDate={setCallDate}
            onGeneratePDF={handleGeneratePDF}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
