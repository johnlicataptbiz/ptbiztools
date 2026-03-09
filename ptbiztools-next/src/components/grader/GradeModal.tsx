"use client";

import { Download, CheckCircle, AlertCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TOOL_BADGES } from "@/constants/tool-badges"
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
    if (score >= 80) return '#059669'
    if (score >= 60) return '#d97706'
    return '#dc2626'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Exceptional'
    if (score >= 80) return 'Strong'
    if (score >= 70) return 'Decent'
    if (score >= 60) return 'Needs Work'
    return 'Significant Issues'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="grade-modal-overlay" onClick={onClose}>
          <motion.div
            className="grade-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Badge */}
            <div className="grade-modal-header">
              <button className="grade-modal-close" onClick={onClose}>
                <X size={20} />
              </button>
              
              <div className="grade-modal-badge-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={TOOL_BADGES.discovery} 
                  alt="Discovery Call Grader" 
                  className="grade-modal-badge"
                />
                <div 
                  className="grade-modal-score"
                  style={{ backgroundColor: getScoreColor(grade.score) }}
                >
                  <span className="grade-modal-score-number">{grade.score}</span>
                  <span className="grade-modal-score-label">{getScoreLabel(grade.score)}</span>
                </div>
              </div>
              
              <h2 className="grade-modal-title">Discovery Call Audit</h2>
              <p className="grade-modal-subtitle">AI-powered call analysis & coaching insights</p>
            </div>
            
            <div className="grade-modal-content">
              {/* Phase Breakdown */}
              <div className="grade-modal-section">
                <h4 className="grade-modal-section-title">Phase Breakdown</h4>
                <div className="grade-modal-phase-list">
                  {grade.phaseScores.map((phase, index) => (
                    <div key={index} className="grade-modal-phase-item">
                      <span className="grade-modal-phase-name">{phase.name}</span>
                      <div className="grade-modal-phase-bar">
                        <div 
                          className="grade-modal-phase-fill"
                          style={{ 
                            width: `${(phase.score / phase.maxScore) * 100}%`,
                            backgroundColor: getScoreColor(phase.score)
                          }}
                        />
                      </div>
                      <span className="grade-modal-phase-score">{phase.score}/{phase.maxScore}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div className="grade-modal-section">
                <h4 className="grade-modal-section-title success">
                  <CheckCircle size={18} />
                  What&apos;s Working Well
                </h4>
                <ul className="grade-modal-list">
                  {grade.strengths.map((strength, i) => (
                    <li key={i}>{strength}</li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="grade-modal-section">
                <h4 className="grade-modal-section-title warning">
                  <AlertCircle size={18} />
                  What Needs Work
                </h4>
                <ul className="grade-modal-list">
                  {grade.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>

              {/* Red Flags */}
              {grade.redFlags.length > 0 && (
                <div className="grade-modal-section red-flags">
                  <h4 className="grade-modal-section-title danger">
                    <AlertCircle size={18} />
                    Red Flags
                  </h4>
                  <ul className="grade-modal-list">
                    {grade.redFlags.map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* PDF Form */}
              <div className="grade-modal-footer">
                <div className="grade-modal-form">
                  <div className="grade-modal-field">
                    <label>Coach Name</label>
                    <input
                      type="text"
                      value={coachName}
                      onChange={(e) => setCoachName(e.target.value)}
                      placeholder="Enter coach name"
                    />
                  </div>
                  <div className="grade-modal-field">
                    <label>Client Name</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div className="grade-modal-field">
                    <label>Call Date</label>
                    <input
                      type="text"
                      value={callDate}
                      onChange={(e) => setCallDate(e.target.value)}
                      placeholder="Enter call date"
                    />
                  </div>
                </div>
                <button className="grade-modal-download-btn" onClick={onGeneratePDF}>
                  <Download size={18} />
                  Generate PDF Report
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
