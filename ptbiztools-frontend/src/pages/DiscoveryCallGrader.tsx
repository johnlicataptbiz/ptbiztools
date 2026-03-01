import { useMemo, useRef, useState, useEffect, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  MessageSquare,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { gradeTranscript, type GradeResult } from '../utils/grader'
import { generatePDF } from '../utils/pdfGenerator'
import { logAction, ActionTypes, saveCoachingAnalysis, savePdfExport } from '../services/api'
import { GradePreview } from '../components/grader/GradePreview'
import { GradeModal } from '../components/grader/GradeModal'
import './DiscoveryCallGrader.css'

const MIN_WORDS = 80

const transcriptTemplate = `Clinician: Thanks for taking the call. What made you reach out now?
Prospect: I have chronic back pain and want to get back to lifting.
Clinician: Got it. What have you already tried, and what is still not working?
Prospect: PT at a chain clinic helped a little but the pain keeps returning.
`

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

export default function DiscoveryCallGrader() {
  const [transcript, setTranscript] = useState('')
  const [grade, setGrade] = useState<GradeResult | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [clientName, setClientName] = useState('')
  const [callDate, setCallDate] = useState('')
  const [analysisId, setAnalysisId] = useState<string | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sessionId] = useState(() => crypto.randomUUID())

  const stats = useMemo(() => getTranscriptStats(transcript), [transcript])

  const checklist = useMemo(
    () => [
      { label: `Transcript has at least ${MIN_WORDS} words`, ok: stats.wordCount >= MIN_WORDS },
      { label: 'Coach and client names are set', ok: coachName.trim().length > 0 && clientName.trim().length > 0 },
      { label: 'Call date is set', ok: callDate.trim().length > 0 },
    ],
    [callDate, clientName, coachName, stats.wordCount],
  )

  const completedChecklist = checklist.filter((item) => item.ok).length
  const canGrade = stats.wordCount >= MIN_WORDS

  useEffect(() => {
    void logAction({
      actionType: ActionTypes.SESSION_STARTED,
      description: 'User started a new grading session',
      sessionId,
    })
  }, [sessionId])

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      setTranscript(content)
      toast.success(`Loaded transcript from ${file.name}`)
    } catch (error) {
      console.error(error)
      toast.error('Could not read transcript file. Use TXT/MD/CSV.')
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
      const result = gradeTranscript(transcript)
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
          phaseScores: result.phaseScores,
          strengths: result.strengths,
          improvements: result.improvements,
          redFlags: result.redFlags,
          deidentifiedTranscript: result.deidentifiedTranscript,
        },
      })

      if (saved.analysisId) {
        setAnalysisId(saved.analysisId)
      }
    } catch (error) {
      toast.error('Failed to grade transcript', { id: 'grading' })
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
      <div className="container">
        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="header-icon">
            <ClipboardList size={28} />
          </div>
          <h1>Discovery Call Grader</h1>
          <p>Dynamic transcript intake, pre-grade diagnostics, and instant coaching reports.</p>
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
                  accept=".txt,.md,.csv,.json"
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
