import { useEffect, useMemo, useState } from 'react'
import { Activity, FileText, RefreshCw, ScrollText } from 'lucide-react'
import {
  getCoachingAnalyses,
  getPdfExports,
  getPLAudits,
  type CoachingAnalysisRecord,
  type PdfExportRecord,
  type PLAuditRecord,
} from '../services/api'
import './AnalysisHistory.css'

interface AnalysisHistoryProps {
  isAdmin: boolean
}

function getToolLabel(row: PdfExportRecord) {
  const tool = (row.metadata as Record<string, unknown> | undefined)?.tool
  if (tool === 'pl_calculator') return 'P&L Audit Export'
  if (tool === 'discovery_call_grader') return 'Discovery Call Export'
  if (row.coachingAnalysisId) return 'Discovery Call Export'
  return 'PDF Export'
}

function readAuditMeta(audit: PLAuditRecord) {
  const meta = (audit.metadata || {}) as Record<string, unknown>
  return {
    score: typeof meta.score === 'number' ? meta.score : null,
    overallGrade: typeof meta.overallGrade === 'string' ? meta.overallGrade : null,
    clientName: typeof meta.clientName === 'string' ? meta.clientName : null,
    coachName: typeof meta.coachName === 'string' ? meta.coachName : null,
  }
}

export default function AnalysisHistory({ isAdmin }: AnalysisHistoryProps) {
  const [analyses, setAnalyses] = useState<CoachingAnalysisRecord[]>([])
  const [pdfExports, setPdfExports] = useState<PdfExportRecord[]>([])
  const [plAudits, setPlAudits] = useState<PLAuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(100)

  const loadAll = async () => {
    setLoading(true)
    setError('')

    const [analysesResult, exportsResult, auditsResult] = await Promise.all([
      getCoachingAnalyses(limit),
      getPdfExports(limit),
      getPLAudits(limit),
    ])

    const nextError = analysesResult.error || exportsResult.error || auditsResult.error
    if (nextError) {
      setError(nextError)
      setLoading(false)
      return
    }

    setAnalyses(analysesResult.analyses || [])
    setPdfExports(exportsResult.pdfExports || [])
    setPlAudits(auditsResult.audits || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [limit])

  const summary = useMemo(() => {
    const totalScore = analyses.reduce((sum, row) => sum + row.score, 0)
    const avg = analyses.length > 0 ? Math.round(totalScore / analyses.length) : 0
    const booked = analyses.filter((row) => row.outcome.toUpperCase() === 'BOOKED').length
    return { avg, booked }
  }, [analyses])

  return (
    <div className="analysis-history">
      <div className="analysis-history-header">
        <div>
          <h1>{isAdmin ? 'Team Activity Records' : 'My Saved Records'}</h1>
          <p>
            {isAdmin
              ? 'View all coach/advisor/admin generated analyses, P&L audits, and PDF exports'
              : 'Your generated discovery analyses, P&L audits, and exports'}
          </p>
        </div>

        <div className="analysis-history-controls">
          <label>
            Limit
            <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>
          <button className="analysis-refresh-btn" onClick={loadAll}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="analysis-summary-grid">
        <div className="analysis-summary-card">
          <span>Discovery Analyses</span>
          <strong>{analyses.length}</strong>
        </div>
        <div className="analysis-summary-card">
          <span>P&L Audits</span>
          <strong>{plAudits.length}</strong>
        </div>
        <div className="analysis-summary-card">
          <span>PDF Exports</span>
          <strong>{pdfExports.length}</strong>
        </div>
        <div className="analysis-summary-card">
          <span>Avg Discovery Score</span>
          <strong>{summary.avg}</strong>
        </div>
        <div className="analysis-summary-card">
          <span>Booked Outcomes</span>
          <strong>{summary.booked}</strong>
        </div>
      </div>

      {loading ? (
        <div className="analysis-empty">Loading saved records...</div>
      ) : error ? (
        <div className="analysis-empty">{error}</div>
      ) : (
        <>
          <section className="history-section">
            <div className="history-section-header">
              <h2>
                <ScrollText size={15} />
                Discovery Call Analyses
              </h2>
            </div>
            {analyses.length === 0 ? (
              <div className="analysis-empty">No discovery analyses saved yet.</div>
            ) : (
              <div className="analysis-list">
                {analyses.map((row) => (
                  <article key={row.id} className="analysis-card">
                    <div className="analysis-card-top">
                      <h3>{row.clientName || 'Unknown Client'}</h3>
                      <span className={`analysis-outcome outcome-${row.outcome.toLowerCase().replace(/\s+/g, '-')}`}>
                        {row.outcome}
                      </span>
                    </div>

                    <div className="analysis-meta-grid">
                      <div>
                        <span className="label">Score</span>
                        <strong>{row.score}/100</strong>
                      </div>
                      <div>
                        <span className="label">Coach</span>
                        <strong>{row.coachName || row.user?.name || 'Unknown'}</strong>
                      </div>
                      <div>
                        <span className="label">Call Date</span>
                        <strong>{row.callDate || 'Not set'}</strong>
                      </div>
                      <div>
                        <span className="label">Saved</span>
                        <strong>{new Date(row.createdAt).toLocaleString()}</strong>
                      </div>
                    </div>

                    {isAdmin && row.user?.name && (
                      <div className="analysis-user-chip">
                        <Activity size={13} />
                        <span>{row.user.name}</span>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="history-section">
            <div className="history-section-header">
              <h2>
                <Activity size={15} />
                P&L Audit Generations
              </h2>
            </div>
            {plAudits.length === 0 ? (
              <div className="analysis-empty">No P&L audits generated yet.</div>
            ) : (
              <div className="analysis-list">
                {plAudits.map((audit) => {
                  const meta = readAuditMeta(audit)
                  return (
                    <article key={audit.id} className="analysis-card">
                      <div className="analysis-card-top">
                        <h3>{meta.clientName || 'P&L Audit'}</h3>
                        <span className="analysis-outcome">{meta.overallGrade || 'Generated'}</span>
                      </div>
                      <div className="analysis-meta-grid">
                        <div>
                          <span className="label">Score</span>
                          <strong>{meta.score !== null ? `${meta.score}/100` : 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="label">Coach</span>
                          <strong>{meta.coachName || audit.user?.name || 'Unknown'}</strong>
                        </div>
                        <div>
                          <span className="label">Type</span>
                          <strong>P&L Audit</strong>
                        </div>
                        <div>
                          <span className="label">Saved</span>
                          <strong>{new Date(audit.createdAt).toLocaleString()}</strong>
                        </div>
                      </div>

                      {isAdmin && audit.user?.name && (
                        <div className="analysis-user-chip">
                          <Activity size={13} />
                          <span>{audit.user.name}</span>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="history-section">
            <div className="history-section-header">
              <h2>
                <FileText size={15} />
                PDF Exports
              </h2>
            </div>
            {pdfExports.length === 0 ? (
              <div className="analysis-empty">No PDF exports saved yet.</div>
            ) : (
              <div className="analysis-list">
                {pdfExports.map((row) => (
                  <article key={row.id} className="analysis-card">
                    <div className="analysis-card-top">
                      <h3>{row.clientName || 'Client PDF'}</h3>
                      <span className="analysis-outcome">{getToolLabel(row)}</span>
                    </div>
                    <div className="analysis-meta-grid">
                      <div>
                        <span className="label">Score</span>
                        <strong>{row.score !== null ? `${row.score}/100` : 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="label">Coach</span>
                        <strong>{row.coachName || row.user?.name || 'Unknown'}</strong>
                      </div>
                      <div>
                        <span className="label">Call Date</span>
                        <strong>{row.callDate || 'Not set'}</strong>
                      </div>
                      <div>
                        <span className="label">Saved</span>
                        <strong>{new Date(row.createdAt).toLocaleString()}</strong>
                      </div>
                    </div>

                    {isAdmin && row.user?.name && (
                      <div className="analysis-user-chip">
                        <Activity size={13} />
                        <span>{row.user.name}</span>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
