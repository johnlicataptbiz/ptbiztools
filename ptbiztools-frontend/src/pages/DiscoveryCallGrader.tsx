import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, X, Download, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { gradeTranscript, type GradeResult } from '../utils/grader'
import { generatePDF } from '../utils/pdfGenerator'
import { logAction, ActionTypes } from '../services/api'
import './DiscoveryCallGrader.css'

function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export default function DiscoveryCallGrader() {
  const [transcript, setTranscript] = useState('')
  const [grade, setGrade] = useState<GradeResult | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [clientName, setClientName] = useState('')
  const [callDate, setCallDate] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [sessionId] = useState(() => generateSessionId())

  useEffect(() => {
    logAction({
      actionType: ActionTypes.SESSION_STARTED,
      description: 'User started a new grading session',
      sessionId,
    })
  }, [sessionId])

  const handleGrade = async () => {
    if (!transcript.trim()) {
      toast.error('Please paste a transcript first')
      return
    }
    
    setIsGrading(true)
    toast.loading('Grading transcript...', { id: 'grading' })
    
    await logAction({
      actionType: ActionTypes.TRANSCRIPT_PASTED,
      description: 'Transcript pasted for grading',
      metadata: { transcriptLength: transcript.length },
      sessionId,
    })
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const result = gradeTranscript(transcript)
    setGrade(result)
    setIsModalOpen(true)
    setIsGrading(false)
    
    toast.success(`Grade complete: ${result.score}/100`, { id: 'grading' })
    
    await logAction({
      actionType: ActionTypes.GRADE_GENERATED,
      description: `Grade generated: ${result.score}/100, Outcome: ${result.outcome}`,
      metadata: { score: result.score, outcome: result.outcome },
      sessionId,
    })
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
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--color-success)'
    if (score >= 60) return 'var(--color-warning)'
    return 'var(--color-error)'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Exceptional'
    if (score >= 80) return 'Strong'
    if (score >= 70) return 'Decent'
    if (score >= 60) return 'Needs Work'
    return 'Significant Issues'
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
          <p>Paste a transcript below to grade and generate feedback for your clients</p>
        </motion.div>

        <motion.div 
          className="grader-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="form-group">
            <label htmlFor="transcript">Call Transcript</label>
            <textarea
              ref={textareaRef}
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the full call transcript here...

Example format:
Clinician: Hello, this is Dr. Smith...
Patient: Hi, I was referred by..."
            />
            <div className="textarea-hint">
              The transcript will be automatically de-identified before grading
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
              disabled={!transcript.trim() || isGrading}
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
        </motion.div>

        {grade && !isModalOpen && (
          <motion.div 
            className="grade-preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="preview-header">
              <h3>Grade Complete</h3>
              <span className="preview-score" style={{ backgroundColor: getScoreColor(grade.score) }}>
                {grade.score}/100
              </span>
            </div>
            <p>{grade.summary}</p>
            <div className="preview-outcome">
              <span className={`outcome-badge ${grade.outcome.toLowerCase()}`}>
                {grade.outcome === 'BOOKED' && <CheckCircle size={14} />}
                {grade.outcome === 'NOT BOOKED' && <AlertCircle size={14} />}
                {grade.outcome === 'UNKNOWN' && <Clock size={14} />}
                {grade.outcome}
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              View Full Report
            </button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && grade && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={closeModal}>
                <X size={24} />
              </button>

              <div className="modal-header">
                <h2>Discovery Call Audit</h2>
                <div 
                  className="score-badge"
                  style={{ backgroundColor: getScoreColor(grade.score) }}
                >
                  <span className="score-number">{grade.score}</span>
                  <span className="score-label">{getScoreLabel(grade.score)}</span>
                </div>
              </div>

              <div className="modal-body">
                <div className="phase-breakdown">
                  <h4>Phase Breakdown</h4>
                  <div className="phase-list">
                    {grade.phaseScores.map((phase, index) => (
                      <div key={index} className="phase-item">
                        <span className="phase-name">{phase.name}</span>
                        <div className="phase-bar">
                          <div 
                            className="phase-fill"
                            style={{ 
                              width: `${(phase.score / phase.maxScore) * 100}%`,
                              backgroundColor: getScoreColor(phase.score)
                            }}
                          />
                        </div>
                        <span className="phase-score">{phase.score}/{phase.maxScore}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-section">
                  <h4 className="section-success">
                    <CheckCircle size={18} />
                    What's Working Well
                  </h4>
                  <ul>
                    {grade.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>

                <div className="modal-section">
                  <h4 className="section-warning">
                    <AlertCircle size={18} />
                    What Needs Work
                  </h4>
                  <ul>
                    {grade.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>

                {grade.redFlags.length > 0 && (
                  <div className="modal-section red-flags">
                    <h4>
                      <AlertCircle size={18} />
                      Red Flags
                    </h4>
                    <ul>
                      {grade.redFlags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <div className="pdf-form">
                  <div className="floating-input-group">
                    <input
                      type="text"
                      id="coachName"
                      placeholder=" "
                      value={coachName}
                      onChange={(e) => setCoachName(e.target.value)}
                    />
                    <label htmlFor="coachName">Coach Name</label>
                  </div>
                  <div className="floating-input-group">
                    <input
                      type="text"
                      id="clientName"
                      placeholder=" "
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                    <label htmlFor="clientName">Client Name</label>
                  </div>
                  <div className="floating-input-group">
                    <input
                      type="text"
                      id="callDate"
                      placeholder=" "
                      value={callDate}
                      onChange={(e) => setCallDate(e.target.value)}
                    />
                    <label htmlFor="callDate">Call Date</label>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleGeneratePDF}>
                  <Download size={18} />
                  Generate PDF Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
