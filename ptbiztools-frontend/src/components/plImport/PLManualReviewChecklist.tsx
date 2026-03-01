interface PLManualReviewChecklistProps {
  requiredFieldsComplete: boolean
  hasLowRequiredConfidence: boolean
  hasWarnings: boolean
  confirmChecked: boolean
  onToggleConfirm: () => void
}

export default function PLManualReviewChecklist({
  requiredFieldsComplete,
  hasLowRequiredConfidence,
  hasWarnings,
  confirmChecked,
  onToggleConfirm,
}: PLManualReviewChecklistProps) {
  return (
    <div className="pl-import-checklist">
      <h4>Manual Review Checklist</h4>
      <ul>
        <li className={requiredFieldsComplete ? 'ok' : 'bad'}>
          {requiredFieldsComplete ? 'Required fields are mapped.' : 'Required fields are incomplete.'}
        </li>
        <li className={!hasLowRequiredConfidence ? 'ok' : 'bad'}>
          {!hasLowRequiredConfidence ? 'No low-confidence required fields.' : 'One or more required fields are low-confidence (<60%).'}
        </li>
        <li className={!hasWarnings ? 'ok' : 'bad'}>
          {!hasWarnings ? 'No parser warnings.' : 'Parser warnings still present and should be reviewed.'}
        </li>
      </ul>

      <label className="pl-import-confirm">
        <input type="checkbox" checked={confirmChecked} onChange={onToggleConfirm} />
        <span>I reviewed mappings and approve using these values for grading.</span>
      </label>
    </div>
  )
}
