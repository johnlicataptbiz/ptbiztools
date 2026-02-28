import { useEffect, useMemo, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { getCoachingAnalyses, type CoachingAnalysisRecord } from '../services/api'
import './AnalysisHistory.css'

interface AnalysisHistoryProps {
  isAdmin: boolean
}

export default function AnalysisHistory({ isAdmin }: AnalysisHistoryProps) {
  const [analyses, setAnalyses] = useState<CoachingAnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(100)

  const loadAnalyses = async () => {
    setLoading(true)
    setError('')
    const { analyses: rows, error: fetchError } = await getCoachingAnalyses(limit)
    if (fetchError) {
      setError(fetchError)
      setLoading(false)
      return
    }
    setAnalyses(rows || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAnalyses()
  }, [limit])

  const summary = useMemo(() => {
    if (analyses.length === 0) return { avg: 0, booked: 0 }
    const totalScore = analyses.reduce((sum, row) => sum + row.score, 0)
    const booked = analyses.filter((row) => row.outcome.toUpperCase() === 'BOOKED').length
    return { avg: Math.round(totalScore / analyses.length), booked }
  }, [analyses])

  return (
    <div className="analysis-history">
      <div className="analysis-history-header">
        <div>
          <h1>{isAdmin ? 'Coaching Analysis Library' : 'My Coaching Analyses'}</h1>
          <p>{isAdmin ? 'All saved grading sessions across coaches' : 'Your saved discovery call grading sessions'}</p>
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
          <button className="analysis-refresh-btn" onClick={loadAnalyses}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="analysis-summary-grid">
        <div className="analysis-summary-card">
          <span>Total Analyses</span>
          <strong>{analyses.length}</strong>
        </div>
        <div className="analysis-summary-card">
          <span>Average Score</span>
          <strong>{summary.avg}</strong>
        </div>
        <div className="analysis-summary-card">
          <span>Booked Outcomes</span>
          <strong>{summary.booked}</strong>
        </div>
      </div>

      {loading ? (
        <div className="analysis-empty">Loading analyses...</div>
      ) : error ? (
        <div className="analysis-empty">{error}</div>
      ) : analyses.length === 0 ? (
        <div className="analysis-empty">No analyses saved yet.</div>
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
    </div>
  )
}
