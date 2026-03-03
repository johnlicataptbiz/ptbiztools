"use client";

import { Download, CheckCircle, AlertCircle } from 'lucide-react'
import { CorexDialog, CorexButton, CorexInput } from "@/components/corex/CorexComponents"
import type { GradeResult } from "@/utils/grader"

interface GradeModalProps {
  isOpen: boolean
  onClose: () => void
  grade: GradeResult
  coachName: string
  setCoachName: (name: string) => void
  clientName: string
  setClientName: (name: string) => void
  callDate: string
  setCallDate: (date: string) => void
  onGeneratePDF: () => void
}

export function GradeModal({
  isOpen,
  onClose,
  grade,
  coachName,
  setCoachName,
  clientName,
  setClientName,
  callDate,
  setCallDate,
  onGeneratePDF
}: GradeModalProps) {
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
    <CorexDialog
      open={isOpen}
      onOpenChange={onClose}
      title="Discovery Call Audit"
    >
      <div className="modal-content">
        <div className="modal-header">
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
              What&apos;s Working Well
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
            <CorexInput
              label="Coach Name"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="Enter coach name"
            />
            <CorexInput
              label="Client Name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
            />
            <CorexInput
              label="Call Date"
              value={callDate}
              onChange={(e) => setCallDate(e.target.value)}
              placeholder="Enter call date"
            />
          </div>
          <CorexButton variant="primary" onClick={onGeneratePDF}>
            <Download size={18} />
            Generate PDF Report
          </CorexButton>
        </div>
      </div>
    </CorexDialog>
  )
}
