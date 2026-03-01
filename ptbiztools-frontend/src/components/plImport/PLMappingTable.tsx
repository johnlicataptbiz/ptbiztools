import type { PLInput } from '../../utils/plTypes'
import type { PLImportFieldMapping, PLImportNumericField } from '../../services/api'

interface CandidateOption {
  id: string
  label: string
  value: number
}

interface PLMappingTableProps {
  finalMap: Record<string, PLImportFieldMapping>
  candidates: CandidateOption[]
  pendingValues: Partial<Record<PLImportNumericField, number | null>>
  pendingCandidateSelection: Record<string, string | null>
  onCandidateChange: (field: PLImportNumericField, candidateId: string | null) => void
  onValueChange: (field: PLImportNumericField, value: number | null) => void
}

const FIELD_LABELS: Record<keyof PLInput, string> = {
  clinicSize: 'Clinic Size',
  clinicModel: 'Clinic Model',
  businessStage: 'Business Stage',
  totalGrossRevenue: 'Total Gross Revenue',
  totalPatientVisits: 'Total Patient Visits',
  revenueFromContinuity: 'Revenue From Continuity',
  totalFacilityCosts: 'Total Facility Costs',
  totalStaffPayroll: 'Total Staff Payroll',
  totalOperatingExpenses: 'Total Operating Expenses',
  ownerSalary: 'Owner Salary',
  ownerAddBacks: 'Owner Add-Backs',
  frontEndRevenue: 'Front-End Revenue',
  tertiaryRevenue: 'Tertiary Revenue',
  marketingSpend: 'Marketing Spend',
  techAdminSpend: 'Tech/Admin Spend',
  merchantFees: 'Merchant Fees',
  retailCOGS: 'Retail COGS',
  leadCount: 'Lead Count',
  evaluationsBooked: 'Evaluations Booked',
  packagesClosed: 'Packages Closed',
  activeContinuityMembers: 'Active Continuity Members',
  npsScore: 'NPS Score',
  patientLTV: 'Patient LTV',
  patientAcquisitionCost: 'Patient Acquisition Cost',
}

const FIELD_ORDER: PLImportNumericField[] = [
  'totalGrossRevenue',
  'totalPatientVisits',
  'revenueFromContinuity',
  'totalFacilityCosts',
  'totalStaffPayroll',
  'totalOperatingExpenses',
  'ownerSalary',
  'ownerAddBacks',
  'frontEndRevenue',
  'tertiaryRevenue',
  'marketingSpend',
  'techAdminSpend',
  'merchantFees',
  'retailCOGS',
  'leadCount',
  'evaluationsBooked',
  'packagesClosed',
  'activeContinuityMembers',
  'npsScore',
  'patientLTV',
  'patientAcquisitionCost',
]

function readFieldValue(
  field: PLImportNumericField,
  finalMap: Record<string, PLImportFieldMapping>,
  pendingValues: Partial<Record<PLImportNumericField, number | null>>,
): number | null {
  const pending = pendingValues[field]
  if (pending !== undefined) return pending
  const existing = finalMap[field]?.value
  return typeof existing === 'number' ? existing : null
}

export default function PLMappingTable({
  finalMap,
  candidates,
  pendingValues,
  pendingCandidateSelection,
  onCandidateChange,
  onValueChange,
}: PLMappingTableProps) {
  return (
    <div className="pl-import-mapping-table">
      <h4>Field Mapping</h4>
      <table>
        <thead>
          <tr>
            <th>Canonical Field</th>
            <th>Suggested Source</th>
            <th>Manual Value</th>
          </tr>
        </thead>
        <tbody>
          {FIELD_ORDER.map((field) => {
            const current = finalMap[field]
            const selection = pendingCandidateSelection[field] ?? current?.candidateId ?? ''
            const value = readFieldValue(field, finalMap, pendingValues)

            return (
              <tr key={field}>
                <td>
                  <strong>{FIELD_LABELS[field]}</strong>
                  <div className="pl-import-field-meta">
                    confidence: {current?.confidence ?? 0}%
                  </div>
                </td>
                <td>
                  <select
                    value={selection || ''}
                    onChange={(event) => onCandidateChange(field, event.target.value || null)}
                  >
                    <option value="">No candidate</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.label} ({candidate.value})
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={value ?? ''}
                    placeholder="manual value"
                    onChange={(event) => {
                      const raw = event.target.value
                      if (raw === '') {
                        onValueChange(field, null)
                        return
                      }
                      const parsed = Number(raw)
                      onValueChange(field, Number.isFinite(parsed) ? parsed : null)
                    }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
