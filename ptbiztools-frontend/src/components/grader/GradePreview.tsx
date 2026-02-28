import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Clock } from 'lucide-react'
import type { GradeResult } from '../../utils/grader'

interface GradePreviewProps {
  grade: GradeResult
  onViewFullReport: () => void
}

export function GradePreview({ grade, onViewFullReport }: GradePreviewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--color-success)'
    if (score >= 60) return 'var(--color-warning)'
    return 'var(--color-error)'
  }

  return (
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
      <button className="btn btn-primary" onClick={onViewFullReport}>
        View Full Report
      </button>
    </motion.div>
  )
}
