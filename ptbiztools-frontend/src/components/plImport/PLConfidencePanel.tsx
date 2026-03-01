interface PLConfidencePanelProps {
  overallConfidence: number
  fieldConfidence: Record<string, number>
  warnings: string[]
}

function confidenceBand(value: number): 'high' | 'medium' | 'low' {
  if (value >= 85) return 'high'
  if (value >= 60) return 'medium'
  return 'low'
}

export default function PLConfidencePanel({ overallConfidence, fieldConfidence, warnings }: PLConfidencePanelProps) {
  const requiredFields = [
    'totalGrossRevenue',
    'totalPatientVisits',
    'revenueFromContinuity',
    'totalFacilityCosts',
    'totalStaffPayroll',
    'totalOperatingExpenses',
    'ownerSalary',
    'ownerAddBacks',
  ]

  return (
    <div className="pl-import-confidence">
      <div className="pl-import-confidence-head">
        <h4>Confidence Review</h4>
        <span className={`pill-${confidenceBand(overallConfidence)}`}>{overallConfidence}%</span>
      </div>

      <div className="pl-import-required-grid">
        {requiredFields.map((field) => {
          const score = fieldConfidence[field] ?? 0
          return (
            <div key={field} className="pl-import-required-item">
              <span>{field}</span>
              <strong className={`pill-${confidenceBand(score)}`}>{score}%</strong>
            </div>
          )
        })}
      </div>

      {warnings.length > 0 ? (
        <div className="pl-import-warning-box">
          <h5>Warnings</h5>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
