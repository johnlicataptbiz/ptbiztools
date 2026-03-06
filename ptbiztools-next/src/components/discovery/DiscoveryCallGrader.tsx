"use client";

import { useMemo, useRef, useState, useEffect, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  MessageSquare,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { GradeResult } from "@/utils/grader";
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

export default function DiscoveryCallGrader() {
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

    setIsGrading(true)
    toast.loading('Grading transcript...', { id: 'grading' })

    await logAction({
      actionType: ActionTypes.TRANSCRIPT_PASTED,
      description: 'Transcript prepared for grading',
      metadata: {
        transcriptLength: transcript.length,
        transcriptWordCount: stats.wordCount,
      },
      sessionId,
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      const payload = {
        transcript,
        program: 'Rainmaker',
        closer: coachName.trim() || 'Unknown',
        prospectName: clientName.trim() || undefined,
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

  const handleClear = () => {
    setTranscript('')
    setGrade(null)
    setCoachName('')
    setClientName('')
    setCallDate('')
    setAnalysisId(undefined)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <div className="grader-page">
      <div className="container tool-page">
        <motion.div
          className="page-header tool-page-hero"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tool-page-badge discovery-tool-badge" src={TOOL_BADGES.discovery} alt="Discovery Call Grader badge" />
          <h1 className="tool-page-title">Discovery Call Grader</h1>
          <p className="tool-page-subtitle">Dynamic transcript intake, pre-grade diagnostics, and instant coaching reports.</p>
        </motion.div>

        <motion.div
          className="grader-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grader-workbench">
            <section className="grader-main-pane">
              <div className="grader-meta-grid">
                <div className="form-group compact">
                  <label htmlFor="coachName">Coach Name</label>
                  <input
                    id="coachName"
                    type="text"
                    value={coachName}
                    onChange={(e) => setCoachName(e.target.value)}
                    placeholder="Danny Matta"
                  />
                </div>
                <div className="form-group compact">
                  <label htmlFor="clientName">Client Name</label>
                  <input
                    id="clientName"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Clinic Owner"
                  />
                </div>
                <div className="form-group compact">
                  <label htmlFor="callDate">Call Date</label>
                  <input
                    id="callDate"
                    type="date"
                    value={callDate}
                    onChange={(e) => setCallDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grader-intake-toolbar">
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

              <div className="form-group">
                <label htmlFor="transcript">Call Transcript</label>
                <textarea
                  ref={textareaRef}
                  id="transcript"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste the full transcript or upload a text file..."
                />
                <div className="textarea-hint">
                  The transcript is automatically de-identified before grading.
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleClear}
                  disabled={!transcript && !grade}
                >
                  Clear
                </button>
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
                      Grade Call
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
                  <div className="grading-progress-steps">
                    {DISCOVERY_GRADING_STAGES.map((stage, index) => {
                      const complete = index < gradingStageIndex
                      const current = index === gradingStageIndex
                      return (
                        <div
                          key={stage.title}
                          className={`grading-progress-step${current ? " is-current" : ""}${complete ? " is-complete" : ""}`}
                        >
                          <span className="grading-progress-step-marker">{complete ? "✓" : current ? "●" : "○"}</span>
                          {stage.title}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
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
                  <div className="diag-item">
                    <span>Clinician Cues</span>
                    <strong>{stats.clinicianMentions}</strong>
                  </div>
                  <div className="diag-item">
                    <span>Prospect Cues</span>
                    <strong>{stats.prospectMentions}</strong>
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
                <div className="tips-footnote">
                  <Clock3 size={14} /> More complete transcripts produce higher confidence coaching feedback.
                </div>
              </div>
            </aside>
          </div>
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
            grade={grade}
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
