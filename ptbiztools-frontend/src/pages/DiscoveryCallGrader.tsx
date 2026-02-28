import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { gradeTranscript, type GradeResult } from '../utils/grader'
import { generatePDF } from '../utils/pdfGenerator'
import { logAction, ActionTypes } from '../services/api'
import { GradePreview } from '../components/grader/GradePreview'
import { GradeModal } from '../components/grader/GradeModal'
import './DiscoveryCallGrader.css'

export default function DiscoveryCallGrader() {
  const [transcript, setTranscript] = useState('')
  const [grade, setGrade] = useState<GradeResult | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [clientName, setClientName] = useState('')
  const [callDate, setCallDate] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Use crypto.randomUUID() instead of Math.random() for secure session IDs
  const [sessionId] = useState(() => crypto.randomUUID())

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
    
    // Yield to main thread to allow UI to update before heavy synchronous grading
    await new Promise(resolve => setTimeout(resolve, 100))
    
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
