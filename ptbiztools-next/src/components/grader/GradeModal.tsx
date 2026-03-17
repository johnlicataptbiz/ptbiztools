"use client";

import { Download, CheckCircle, AlertCircle, X, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GraderResultData } from './types'

interface GradeModalProps {
  isOpen: boolean
  onClose: () => void
  result: GraderResultData
  badgeSrc: string
  badgeAlt: string
  title?: string
  subtitle?: string
  coachName: string
  setCoachName: (name: string) => void
  clientName: string
  setClientName: (name: string) => void
  callDate: string
  setCallDate: (date: string) => void
  onGeneratePDF: () => void
  onViewHistory?: () => void
}

export function GradeModal({
  isOpen,
  onClose,
  result,
  badgeSrc,
  badgeAlt,
  title = "Call Audit",
  subtitle = "AI-powered call analysis & coaching insights",
  coachName,
  setCoachName,
  clientName,
  setClientName,
  callDate,
  setCallDate,
  onGeneratePDF,
  onViewHistory
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
                <img 
                  src={badgeSrc} 
                  alt={badgeAlt} 
                  className="grade-modal-badge"
                />
                <div 
                  className="grade-modal-score"
                  style={{ backgroundColor: getScoreColor(result.score) }}
                >
                  <span className="grade-modal-score-number">{result.score}</span>
                  <span className="grade-modal-score-label">{getScoreLabel(result.score)}</span>
                </div>
              </div>
              
              <h2 className="grade-modal-title">{title}</h2>
              <p className="grade-modal-subtitle">{subtitle}</p>
            </div>
            
            <div className="grade-modal-content">
              {/* Phase Breakdown */}
              <div className="grade-modal-section">
                <h4 className="grade-modal-section-title">Phase Breakdown</h4>
                <div className="grade-modal-phase-list">
                  {result.phaseScores.map((phase, index) => (
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
              {result.strengths.length > 0 && (
                <div className="grade-modal-section">
                  <h4 className="grade-modal-section-title success">
                    <CheckCircle size={18} />
                    What&apos;s Working Well
                  </h4>
                  <ul className="grade-modal-list">
                    {result.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {result.improvements.length > 0 && (
                <div className="grade-modal-section">
                  <h4 className="grade-modal-section-title warning">
                    <AlertCircle size={18} />
                    What Needs Work
                  </h4>
                  <ul className="grade-modal-list">
                    {result.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Red Flags */}
              {result.redFlags.length > 0 && (
                <div className="grade-modal-section red-flags">
                  <h4 className="grade-modal-section-title danger">
                    <AlertCircle size={18} />
                    Red Flags
                  </h4>
                  <ul className="grade-modal-list">
                    {result.redFlags.map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Critical Behaviors (if available) */}
              {result.criticalBehaviors && result.criticalBehaviors.length > 0 && (
                <div className="grade-modal-section">
                  <h4 className="grade-modal-section-title">Critical Behaviors</h4>
                  <div className="grade-modal-phase-list">
                    {result.criticalBehaviors.map((behavior) => (
                      <div key={behavior.id} className="grade-modal-phase-item">
                        <span className="grade-modal-phase-name">{behavior.name}</span>
                        <span 
                          className="grade-modal-phase-score"
                          style={{ 
                            color: behavior.status === 'pass' ? '#059669' : 
                                   behavior.status === 'unknown' ? '#64748b' : '#dc2626',
                            fontWeight: 600
                          }}
                        >
                          {behavior.status === 'pass' ? '✓ PASS' : 
                           behavior.status === 'unknown' ? '? UNKNOWN' : '✗ FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
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
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  {onViewHistory && (
                    <button 
                      className="grade-modal-download-btn" 
                      onClick={onViewHistory}
                      style={{ flex: 1, background: '#64748b' }}
                    >
                      <History size={18} />
                      View History
                    </button>
                  )}
                  <button 
                    className="grade-modal-download-btn" 
                    onClick={onGeneratePDF}
                    style={{ flex: 2 }}
                  >
                    <Download size={18} />
                    Generate PDF Report
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
