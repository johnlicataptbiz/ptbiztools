import { useEffect, useMemo, useState } from 'react'
import { CorexButton, CorexDialog } from '../corex/CorexComponents'
import {
  approvePLImport,
  createPLImport,
  getPLImport,
  listPLImports,
  updatePLImportMapping,
  type PLImportApprovalDto,
  type PLImportDetailDto,
  type PLImportNumericField,
  type PLImportSessionDto,
} from '../../services/api'
import type { PLInput } from '../../utils/plTypes'
import PLConfidencePanel from './PLConfidencePanel'
import PLManualReviewChecklist from './PLManualReviewChecklist'
import PLMappingTable from './PLMappingTable'
import PLParsePreview from './PLParsePreview'

const REQUIRED_FIELDS: (keyof PLInput)[] = [
  'totalGrossRevenue',
  'totalPatientVisits',
  'revenueFromContinuity',
  'totalFacilityCosts',
  'totalStaffPayroll',
  'totalOperatingExpenses',
  'ownerSalary',
  'ownerAddBacks',
]

interface CandidateOption {
  id: string
  label: string
  value: number
}

interface PLImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyMappedInput: (
    mappedInput: Partial<Record<PLImportNumericField, number>>,
    approval?: PLImportApprovalDto,
  ) => void
}

function mapTablePreview(value: unknown): string[][] {
  if (!Array.isArray(value)) return []

  return value
    .filter((row): row is unknown[] => Array.isArray(row))
    .slice(0, 30)
    .map((row) => row.map((cell) => String(cell ?? '')))
}

function mapCandidates(detail: PLImportDetailDto | null): CandidateOption[] {
  const extraction = detail?.parseArtifact?.rawExtraction as { candidates?: unknown } | undefined
  const list = extraction?.candidates
  if (!Array.isArray(list)) return []

  return list
    .map((candidate) => {
      if (!candidate || typeof candidate !== 'object') return null
      const value = (candidate as { value?: unknown }).value
      const id = (candidate as { id?: unknown }).id
      const label = (candidate as { label?: unknown }).label
      if (typeof id !== 'string' || typeof label !== 'string' || typeof value !== 'number' || !Number.isFinite(value)) {
        return null
      }
      return { id, label, value }
    })
    .filter((candidate): candidate is CandidateOption => candidate !== null)
}

function getFieldConfidence(detail: PLImportDetailDto | null): Record<string, number> {
  if (!detail?.mapping?.fieldConfidence || typeof detail.mapping.fieldConfidence !== 'object') return {}
  return detail.mapping.fieldConfidence
}

export default function PLImportDialog({ open, onOpenChange, onApplyMappedInput }: PLImportDialogProps) {
  const [recentImports, setRecentImports] = useState<PLImportSessionDto[]>([])
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PLImportDetailDto | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [sourceLabel, setSourceLabel] = useState('')
  const [pendingValues, setPendingValues] = useState<Partial<Record<PLImportNumericField, number | null>>>({})
  const [pendingCandidateSelection, setPendingCandidateSelection] = useState<Record<string, string | null>>({})
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isRemapping, setIsRemapping] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const warnings = detail?.warnings || []
  const fieldConfidence = getFieldConfidence(detail)
  const requiredFieldsComplete = Boolean(detail?.import.requiredFieldsComplete)
  const lowRequiredFields = REQUIRED_FIELDS.filter((field) => (fieldConfidence[field] ?? 0) < 60)
  const hasLowRequiredConfidence = lowRequiredFields.length > 0
  const hasWarnings = warnings.length > 0
  const manualReviewRequired = !requiredFieldsComplete || hasLowRequiredConfidence || hasWarnings
  const hasPendingPatch = Object.keys(pendingValues).length > 0 || Object.keys(pendingCandidateSelection).length > 0

  const finalMap = detail?.mapping?.finalMap || {}
  const candidates = useMemo(() => mapCandidates(detail), [detail])
  const extraction = detail?.parseArtifact?.rawExtraction as {
    tablePreview?: unknown
    textPreview?: unknown
    sourceType?: unknown
  } | undefined
  const tablePreview = mapTablePreview(extraction?.tablePreview)
  const textPreview = typeof extraction?.textPreview === 'string' ? extraction.textPreview : ''
  const sourceType = detail?.import.sourceType || (typeof extraction?.sourceType === 'string' ? extraction.sourceType : 'unknown')

  async function loadImports() {
    setError(null)
    const response = await listPLImports()
    if (response.error) {
      setError(response.error)
      return
    }

    const imports = response.imports || []
    setRecentImports(imports)
    if (!selectedImportId && imports[0]?.id) {
      setSelectedImportId(imports[0].id)
    }
  }

  async function loadDetail(importId: string) {
    setIsLoadingDetail(true)
    setError(null)

    const response = await getPLImport(importId)
    setIsLoadingDetail(false)

    if (response.error || !response.detail) {
      setError(response.error || 'Failed to load import details')
      return
    }

    setDetail(response.detail)
  }

  useEffect(() => {
    if (!open) return
    void loadImports()
  }, [open])

  useEffect(() => {
    if (!open || !selectedImportId) return
    void loadDetail(selectedImportId)
  }, [open, selectedImportId])

  function resetPendingPatchState() {
    setPendingValues({})
    setPendingCandidateSelection({})
    setConfirmChecked(false)
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError('Select at least one file before uploading.')
      return
    }

    setError(null)
    setIsUploading(true)

    let newestImportId: string | null = null
    const errors: string[] = []

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      if (sourceLabel.trim()) {
        const label = files.length > 1 ? `${sourceLabel.trim()} - ${file.name}` : sourceLabel.trim()
        formData.append('sourceLabel', label)
      }

      // Upload each file as its own reviewable import session.
      const response = await createPLImport(formData)
      if (response.error || !response.importId) {
        errors.push(`${file.name}: ${response.error || 'upload failed'}`)
        continue
      }
      newestImportId = response.importId
    }

    setIsUploading(false)

    if (!newestImportId) {
      setError(errors.length > 0 ? errors.join(' | ') : 'Failed to upload import files')
      return
    }

    setFiles([])
    setSourceLabel('')
    setSelectedImportId(newestImportId)
    resetPendingPatchState()
    await loadImports()
    await loadDetail(newestImportId)

    if (errors.length > 0) {
      setError(`Uploaded ${files.length - errors.length} of ${files.length} files. ${errors.join(' | ')}`)
    }
  }

  function handleValueChange(field: PLImportNumericField, value: number | null) {
    setPendingValues((prev) => ({ ...prev, [field]: value }))
    setConfirmChecked(false)
  }

  function handleCandidateChange(field: PLImportNumericField, candidateId: string | null) {
    setPendingCandidateSelection((prev) => ({ ...prev, [field]: candidateId }))
    setConfirmChecked(false)
  }

  async function handleApplyPatch() {
    if (!selectedImportId || !hasPendingPatch) return

    setIsRemapping(true)
    setError(null)

    const response = await updatePLImportMapping(selectedImportId, {
      values: pendingValues,
      useCandidate: pendingCandidateSelection,
    })

    setIsRemapping(false)

    if (response.error) {
      setError(response.error)
      return
    }

    resetPendingPatchState()
    await loadDetail(selectedImportId)
    await loadImports()
  }

  async function handleApproveAndApply() {
    if (!selectedImportId || !detail?.mapping) return

    if (!requiredFieldsComplete) {
      setError('Required fields are incomplete. Complete mapping before approval.')
      return
    }

    if (manualReviewRequired && !confirmChecked) {
      setError('Manual review confirmation is required before approval.')
      return
    }

    setError(null)
    setIsApproving(true)
    const response = await approvePLImport(selectedImportId, true)
    setIsApproving(false)

    if (response.error || !response.approval) {
      setError(response.error || 'Failed to approve import')
      return
    }

    onApplyMappedInput(response.approval.mappedInput, response.approval)
    onOpenChange(false)
    resetPendingPatchState()
  }

  return (
    <CorexDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import P&L"
      description="Upload CSV, XLSX, PDF, or image files and review confidence before grading."
      size="xl"
    >
      <div className="pl-import-dialog">
        <div className="pl-import-upload">
          <div className="pl-import-upload-fields">
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
            />
            {files.length > 0 ? (
              <span className="pl-import-selected-files">{files.length} file{files.length === 1 ? '' : 's'} selected</span>
            ) : null}
            <input
              type="text"
              placeholder="Optional source label (e.g. Jan 2026 P&L)"
              value={sourceLabel}
              onChange={(event) => setSourceLabel(event.target.value)}
            />
          </div>
          <CorexButton onClick={handleUpload} loading={isUploading} disabled={isUploading}>
            Upload and Parse
          </CorexButton>
        </div>

        <div className="pl-import-history">
          <h4>Recent Imports</h4>
          <div className="pl-import-history-list">
            {recentImports.length === 0 ? <span>No previous imports yet.</span> : null}
            {recentImports.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`pl-import-history-item ${item.id === selectedImportId ? 'active' : ''}`}
                onClick={() => {
                  setSelectedImportId(item.id)
                  resetPendingPatchState()
                }}
              >
                <strong>{item.filename}</strong>
                <span>{item.status} · {item.overallConfidence}%</span>
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="pl-import-error">{error}</div> : null}

        {isLoadingDetail ? (
          <div className="pl-import-loading">Loading import details...</div>
        ) : null}

        {detail ? (
          <div className="pl-import-review-grid">
            <PLParsePreview tablePreview={tablePreview} textPreview={textPreview} sourceType={sourceType} />
            <PLMappingTable
              finalMap={finalMap}
              candidates={candidates}
              pendingValues={pendingValues}
              pendingCandidateSelection={pendingCandidateSelection}
              onCandidateChange={handleCandidateChange}
              onValueChange={handleValueChange}
            />
            <div className="pl-import-mapping-actions">
              <CorexButton
                variant="secondary"
                onClick={handleApplyPatch}
                loading={isRemapping}
                disabled={!hasPendingPatch || isRemapping}
              >
                Recompute Mapping
              </CorexButton>
            </div>
            <PLConfidencePanel
              overallConfidence={detail.import.overallConfidence}
              fieldConfidence={fieldConfidence}
              warnings={warnings}
            />
            <PLManualReviewChecklist
              requiredFieldsComplete={requiredFieldsComplete}
              hasLowRequiredConfidence={hasLowRequiredConfidence}
              hasWarnings={hasWarnings}
              confirmChecked={confirmChecked}
              onToggleConfirm={() => setConfirmChecked((prev) => !prev)}
            />
          </div>
        ) : null}

        <div className="pl-import-footer">
          <CorexButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </CorexButton>
          <CorexButton
            onClick={handleApproveAndApply}
            loading={isApproving}
            disabled={!detail?.mapping || isApproving || isRemapping || !requiredFieldsComplete || (manualReviewRequired && !confirmChecked)}
          >
            Approve and Apply to Calculator
          </CorexButton>
        </div>
      </div>
    </CorexDialog>
  )
}
