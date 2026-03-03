import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, Download, DollarSign, TrendingUp, Users, Activity, ArrowRight, ArrowLeft, Sun, Moon, Sparkles, Target, CheckCircle2, Circle, GripVertical, Volume2, VolumeX, FileUp } from 'lucide-react'
import { NumberFormatBase } from 'react-number-format'
import { usePLGrader } from '../utils/usePLGrader'
import type { ActionItem, MetricResult, PLInput } from '../utils/plTypes'
import { GRADE_COLORS } from '../utils/plTypes'
import ReactConfetti from 'react-confetti'
import { DndContext, closestCenter } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CorexDialog, CorexButton } from '../components/corex/CorexComponents'
import PLImportDialog from '../components/plImport/PLImportDialog'
import {
  addPLImportBatchItem,
  approvePLImportBatch,
  createPLImportBatch,
  getPLImportBatch,
  listPLImportBatches,
  logAction,
  removePLImportBatchItem,
  savePdfExport,
  type PLImportApprovalDto,
  type PLImportBatchDetailDto,
  type PLImportNumericField,
} from '../services/api'
import { buildMastermindPLResult, type MastermindPeriod } from '../utils/pl/mastermindEngine'
import { buildScenarioForecast, buildSensitivityLevers } from '../utils/pl/scenario'
import {
  REQUIRED_CORE_FIELDS,
  validateMastermindTimeline,
  validateRainmakerInput,
} from '../utils/pl/validation'
import { SITE_LOGO_URL } from '../constants/branding'
import { generatePLReportPDF } from '../utils/plPdfGenerator'
import './PLCalculator.css'

// Sound effects hook
function useSoundEffects(enabled: boolean) {
  const playEliteSound = useCallback(() => {
    if (!enabled) return
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
    oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.2)
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.4)
  }, [enabled])

  const playCriticalSound = useCallback(() => {
    if (!enabled) return
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime)
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime + 0.1)
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2)
    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.2)
  }, [enabled])

  return { playEliteSound, playCriticalSound }
}

// Tooltip component
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="tooltip-wrapper">
      {children}
      <div className="tooltip-content">{content}</div>
    </div>
  )
}

// Skeleton loader (defined below at line 208)

const initialInput: PLInput = {
  clinicSize: 'individual',
  clinicModel: 'cash',
  businessStage: 'growth',
  totalGrossRevenue: 0,
  totalPatientVisits: 0,
  revenueFromContinuity: 0,
  totalFacilityCosts: 0,
  totalStaffPayroll: 0,
  totalOperatingExpenses: 0,
  ownerSalary: 0,
  ownerAddBacks: 0,
  frontEndRevenue: undefined,
  tertiaryRevenue: undefined,
  marketingSpend: undefined,
  techAdminSpend: undefined,
  merchantFees: undefined,
  retailCOGS: undefined,
  leadCount: undefined,
  evaluationsBooked: undefined,
  packagesClosed: undefined,
  activeContinuityMembers: undefined,
  npsScore: undefined,
  patientLTV: undefined,
  patientAcquisitionCost: undefined
}

const steps = [
  { id: 1, title: 'Clinic DNA', icon: Activity },
  { id: 2, title: 'Financials', icon: DollarSign },
  { id: 3, title: 'Report Card', icon: Target }
]

type GuidedSectionId = 'revenue' | 'expenses' | 'owner'

interface GuidedSectionConfig {
  id: GuidedSectionId
  title: string
  description: string
  fields: (keyof PLInput)[]
}

interface GuidedSectionProgress extends GuidedSectionConfig {
  completedCount: number
  totalCount: number
  isComplete: boolean
  isUnlocked: boolean
  nextField: keyof PLInput | null
  nextFieldLabel: string | null
}

const GUIDED_CORE_SECTIONS: GuidedSectionConfig[] = [
  {
    id: 'revenue',
    title: 'Revenue Foundation',
    description: 'Set baseline revenue, visits, and recurring continuity streams.',
    fields: ['totalGrossRevenue', 'totalPatientVisits', 'revenueFromContinuity'],
  },
  {
    id: 'expenses',
    title: 'Expense Structure',
    description: 'Capture facility, payroll, and operating cost profile.',
    fields: ['totalFacilityCosts', 'totalStaffPayroll', 'totalOperatingExpenses'],
  },
  {
    id: 'owner',
    title: 'Owner Economics',
    description: 'Finalize owner compensation and add-backs for ODI accuracy.',
    fields: ['ownerSalary', 'ownerAddBacks'],
  },
]

const CORE_FIELD_LABELS: Partial<Record<keyof PLInput, string>> = {
  totalGrossRevenue: 'Total Gross Revenue',
  totalPatientVisits: 'Patient Visits',
  revenueFromContinuity: 'Continuity Revenue',
  totalFacilityCosts: 'Facility Costs',
  totalStaffPayroll: 'Staff Payroll',
  totalOperatingExpenses: 'Operating Expenses',
  ownerSalary: 'Owner Salary',
  ownerAddBacks: 'Owner Add-Backs',
}

function buildPLInputFromMappedImport(mappedInput: Partial<Record<PLImportNumericField, number>>): PLInput {
  const nextInput: PLInput = { ...initialInput }
  for (const [key, value] of Object.entries(mappedInput)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    ;(nextInput as unknown as Record<string, number | string | undefined>)[key] = value
  }
  return nextInput
}

type ProgramMode = 'rainmaker' | 'mastermind'

function RadialProgress({ value, max, grade, size = 80 }: { value: number; max: number; grade: string; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(value / max, 1)
  const offset = circumference - progress * circumference
  const color = grade === 'green' ? GRADE_COLORS.green : grade === 'yellow' ? GRADE_COLORS.yellow : GRADE_COLORS.red

  return (
    <svg width={size} height={size} className="radial-progress">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        className="radial-bg"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="radial-fill"
      />
    </svg>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 60
  const height = 20
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ')

  return (
    <svg width={width} height={height} className="sparkline">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function SortableActionCard({ item, onToggle }: { item: any; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div ref={setNodeRef} style={style} className="action-card" data-phase={item.phase}>
      <div className="action-card-grip" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>
      <button className="action-card-check" onClick={() => onToggle(item.id)}>
        {item.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>
      <div className="action-card-body">
        <span className={`action-card-text ${item.completed ? 'completed' : ''}`}>{item.text}</span>
        {item.target ? <span className="action-card-meta">Target: {item.target}</span> : null}
        {item.expectedImpact ? <span className="action-card-meta">Impact: {item.expectedImpact}</span> : null}
      </div>
    </div>
  )
}

function KanbanColumn({ phase, title, items, onToggle }: { phase: number; title: string; items: any[]; onToggle: (id: string) => void }) {
  return (
    <div className="kanban-column" data-phase={phase}>
      <div className="kanban-header">
        <span className="kanban-title">{title}</span>
        <span className="kanban-count">{items.length}</span>
      </div>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-cards">
          {items.map(item => (
            <SortableActionCard key={item.id} item={item} onToggle={onToggle} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

function calculatePLScore(greenCount: number, yellowCount: number, redCount: number) {
  const total = greenCount + yellowCount + redCount
  if (total === 0) return 0
  return Math.round(((greenCount * 100) + (yellowCount * 70) + (redCount * 40)) / total)
}

export default function PLCalculator() {
  const [input, setInput] = useState<PLInput>(initialInput)
  const [programMode, setProgramMode] = useState<ProgramMode>('rainmaker')
  const [entryMode, setEntryMode] = useState<'guided' | 'power'>('guided')
  const [mastermindPeriods, setMastermindPeriods] = useState<MastermindPeriod[]>([])
  const [mastermindPeriodLabel, setMastermindPeriodLabel] = useState('')
  const [mastermindNotice, setMastermindNotice] = useState<string | null>(null)
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
  const [activeBatchStatus, setActiveBatchStatus] = useState<string | null>(null)
  const [isBatchSyncing, setIsBatchSyncing] = useState(false)
  const [importedFields, setImportedFields] = useState<Set<keyof PLInput>>(new Set())
  const [currentStep, setCurrentStep] = useState(1)
  const [showResults, setShowResults] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [clientName, setClientName] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isExporting, setIsExporting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const hasLoggedResultRef = useRef(false)
  const [sessionId] = useState(() => crypto.randomUUID())
  const { playEliteSound, playCriticalSound } = useSoundEffects(soundEnabled)
  const toggleCommandPalette = useCallback(() => {
    setShowQuickActions((open) => !open)
  }, [])

  const sortedMastermindPeriods = useMemo(
    () => [...mastermindPeriods].sort((a, b) => a.order - b.order),
    [mastermindPeriods],
  )
  const currentInputValidation = useMemo(() => validateRainmakerInput(input), [input])
  const mastermindTimelineValidation = useMemo(
    () => validateMastermindTimeline(sortedMastermindPeriods),
    [sortedMastermindPeriods],
  )
  const missingRequiredFieldSet = useMemo(
    () => new Set(currentInputValidation.missingRequiredFields),
    [currentInputValidation.missingRequiredFields],
  )

  const formatFieldLabel = useCallback((field: keyof PLInput) => {
    const mapped = CORE_FIELD_LABELS[field]
    if (mapped) return mapped
    return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase())
  }, [])

  const nextMissingRequiredField = useMemo(
    () => currentInputValidation.missingRequiredFields[0] ?? null,
    [currentInputValidation.missingRequiredFields],
  )

  const guidedSections = useMemo<GuidedSectionProgress[]>(() => {
    let previousSectionsComplete = true
    return GUIDED_CORE_SECTIONS.map((section) => {
      const completedCount = section.fields.reduce((count, field) => {
        const hasError = Boolean(currentInputValidation.errorsByField[field]?.length)
        return !missingRequiredFieldSet.has(field) && !hasError ? count + 1 : count
      }, 0)

      const nextField = section.fields.find((field) => {
        const hasError = Boolean(currentInputValidation.errorsByField[field]?.length)
        return missingRequiredFieldSet.has(field) || hasError
      }) ?? null

      const isComplete = completedCount === section.fields.length
      const isUnlocked = previousSectionsComplete
      if (!isComplete) previousSectionsComplete = false

      return {
        ...section,
        completedCount,
        totalCount: section.fields.length,
        isComplete,
        isUnlocked,
        nextField,
        nextFieldLabel: nextField ? formatFieldLabel(nextField) : null,
      }
    })
  }, [currentInputValidation.errorsByField, formatFieldLabel, missingRequiredFieldSet])

  const guidedSectionMap = useMemo(() => {
    const mapped: Partial<Record<GuidedSectionId, GuidedSectionProgress>> = {}
    for (const section of guidedSections) {
      mapped[section.id] = section
    }
    return mapped as Record<GuidedSectionId, GuidedSectionProgress>
  }, [guidedSections])

  const rainmakerResult = usePLGrader(showResults && programMode === 'rainmaker' ? input : null)
  const mastermindResult = useMemo(() => {
    if (!showResults || programMode !== 'mastermind') return null
    return buildMastermindPLResult(sortedMastermindPeriods)
  }, [programMode, showResults, sortedMastermindPeriods])

  const result = programMode === 'mastermind' ? mastermindResult : rainmakerResult
  const isV2Enabled = ['true', '1', 'yes', 'on'].includes(
    String(import.meta.env.VITE_PL_CALCULATOR_V2 || '').toLowerCase().trim(),
  )
  const isImportsEnabled = ['true', '1', 'yes', 'on'].includes(
    String(import.meta.env.VITE_PL_IMPORTS_ENABLED || '').toLowerCase().trim(),
  )
  const validationSummary = programMode === 'mastermind'
    ? mastermindTimelineValidation
    : currentInputValidation
  const isGuidedRainmaker = programMode === 'rainmaker' && entryMode === 'guided'
  const hasBlockingInputErrors = currentInputValidation.hasBlockingErrors
  const hasAllRequiredCoreFields = currentInputValidation.missingRequiredFields.length === 0
  const canRunRainmakerCalculation = !hasBlockingInputErrors
  const canOpenAdvancedInputs = !isGuidedRainmaker || hasAllRequiredCoreFields
  const nextRequiredFieldLabel = nextMissingRequiredField ? formatFieldLabel(nextMissingRequiredField) : null
  const revenueSectionState = guidedSectionMap.revenue
  const expensesSectionState = guidedSectionMap.expenses
  const ownerSectionState = guidedSectionMap.owner
  const isRevenueLocked = isGuidedRainmaker && !revenueSectionState.isUnlocked
  const isExpensesLocked = isGuidedRainmaker && !expensesSectionState.isUnlocked
  const isOwnerLocked = isGuidedRainmaker && !ownerSectionState.isUnlocked
  const mastermindChecklist = useMemo(
    () => [
      {
        id: 'periods',
        label: 'At least 2 periods saved',
        done: sortedMastermindPeriods.length >= 2,
      },
      {
        id: 'errors',
        label: 'No blocking timeline issues',
        done: !mastermindTimelineValidation.hasBlockingErrors,
      },
    ],
    [mastermindTimelineValidation.hasBlockingErrors, sortedMastermindPeriods.length],
  )
  const mastermindNextAction = useMemo(() => {
    if (sortedMastermindPeriods.length < 2) {
      return 'Save at least two periods to unlock trajectory scoring.'
    }
    if (mastermindTimelineValidation.errors.length > 0) {
      return mastermindTimelineValidation.errors[0]
    }
    return 'Timeline ready. Continue to calculate trajectory.'
  }, [mastermindTimelineValidation.errors, sortedMastermindPeriods.length])

  const hydrateMastermindPeriodsFromBatch = useCallback((detail: PLImportBatchDetailDto) => {
    const periods = detail.items.reduce<MastermindPeriod[]>((acc, item) => {
      if (!item.import.mappedInput) return acc
      acc.push({
        id: item.id,
        label: item.periodLabel,
        input: buildPLInputFromMappedImport(item.import.mappedInput),
        order: item.periodOrder,
        source: 'import',
        importSessionId: item.import.id,
      })
      return acc
    }, [])

    setMastermindPeriods(periods)
    setActiveBatchStatus(detail.batch.status)
  }, [])

  const refreshBatchState = useCallback(async (batchId: string): Promise<boolean> => {
    const response = await getPLImportBatch(batchId)
    if (response.error || !response.detail) {
      setMastermindNotice(response.error || 'Failed to refresh Mastermind timeline from server.')
      return false
    }

    hydrateMastermindPeriodsFromBatch(response.detail)
    return true
  }, [hydrateMastermindPeriodsFromBatch])

  useEffect(() => {
    if (!isImportsEnabled || programMode !== 'mastermind') return

    let isCancelled = false
    const initializeBatch = async () => {
      setIsBatchSyncing(true)
      setMastermindNotice(null)

      const listed = await listPLImportBatches()
      if (isCancelled) return

      let selectedBatch = listed.batches?.find((batch) => batch.programType === 'mastermind' && batch.status !== 'approved')
        || listed.batches?.find((batch) => batch.programType === 'mastermind')

      if (!selectedBatch) {
        const created = await createPLImportBatch({ programType: 'mastermind' })
        if (isCancelled) return
        if (created.error || !created.batch) {
          setMastermindNotice(created.error || 'Failed to create import timeline batch.')
          setIsBatchSyncing(false)
          return
        }
        selectedBatch = created.batch
      }

      setActiveBatchId(selectedBatch.id)
      setActiveBatchStatus(selectedBatch.status)

      const refreshed = await refreshBatchState(selectedBatch.id)
      if (isCancelled) return

      if (refreshed) {
        setMastermindNotice((previous) => {
          if (previous) return previous
          return selectedBatch?.itemCount
            ? `Loaded ${selectedBatch.itemCount} import-backed period${selectedBatch.itemCount === 1 ? '' : 's'} from server timeline.`
            : null
        })
      }

      setIsBatchSyncing(false)
    }

    void initializeBatch()

    return () => {
      isCancelled = true
    }
  }, [isImportsEnabled, programMode, refreshBatchState])

  useEffect(() => {
    void logAction({
      actionType: 'pl_session_started',
      description: 'User started a P&L grading session',
      sessionId,
    })
  }, [sessionId])

  useEffect(() => {
    if (result && showResults) {
      setActionItems(result.actionPlan)
      if (result.overallGrade === 'green') {
        setShowConfetti(true)
        playEliteSound()
        setTimeout(() => setShowConfetti(false), 5000)
      } else if (result.overallGrade === 'red') {
        playCriticalSound()
      }
    }
  }, [result, showResults, playEliteSound, playCriticalSound])

  useEffect(() => {
    if (!result || !showResults || currentStep !== 3 || hasLoggedResultRef.current) return

    const greenCount = result.metrics.filter((metric) => metric.grade === 'green').length
    const yellowCount = result.metrics.filter((metric) => metric.grade === 'yellow').length
    const redCount = result.metrics.filter((metric) => metric.grade === 'red').length
    const score = typeof result.score === 'number' ? result.score : calculatePLScore(greenCount, yellowCount, redCount)

    hasLoggedResultRef.current = true
    void logAction({
      actionType: 'pl_report_generated',
      description: `P&L report generated (${result.overallGrade})`,
      sessionId,
      metadata: {
        score,
        overallGrade: result.overallGrade,
        coachName: coachName || null,
        clientName: clientName || null,
        metricCount: result.metrics.length,
        benchmarkVersion: result.benchmarkVersion,
        confidence: result.confidence,
        calculatorMode: programMode,
        periodCount: programMode === 'mastermind' ? sortedMastermindPeriods.length : 1,
        warningCount: result.warnings.length,
        warnings: result.warnings,
        metrics: result.metrics.map((metric) => ({
          id: metric.id,
          grade: metric.grade,
          value: metric.value,
          threshold: metric.threshold,
          group: metric.group,
        })),
      },
    })
  }, [coachName, clientName, currentStep, programMode, result, sessionId, showResults, sortedMastermindPeriods.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette])

  useEffect(() => {
    if (!canOpenAdvancedInputs && showAdvancedInputs) {
      setShowAdvancedInputs(false)
    }
  }, [canOpenAdvancedInputs, showAdvancedInputs])

  const handleInputChange = (field: keyof PLInput, value: string | number) => {
    setInput(prev => ({ ...prev, [field]: value }))
    if (programMode === 'mastermind') {
      setMastermindNotice(null)
    }
  }

  const inputHasRequiredCoreValues = useCallback((candidate: PLInput) => {
    const candidateValidation = validateRainmakerInput(candidate)
    return !candidateValidation.missingRequiredFields.length && !candidateValidation.hasBlockingErrors
  }, [])

  const upsertMastermindPeriod = useCallback((
    label: string,
    snapshot: PLInput,
    source: 'manual' | 'import',
  ): boolean => {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      setMastermindNotice('Add a period label (for example: FY2024, TTM 2025).')
      return false
    }

    if (!inputHasRequiredCoreValues(snapshot)) {
      setMastermindNotice('Complete required core fields before saving this period.')
      return false
    }

    setMastermindPeriods((prev) => {
      const existing = prev.find((period) => period.label.toLowerCase() === trimmedLabel.toLowerCase())
      if (existing) {
        return prev.map((period) => (
          period.id === existing.id
            ? { ...period, label: trimmedLabel, input: { ...snapshot }, source }
            : period
        ))
      }

      const nextOrder = prev.length > 0 ? Math.max(...prev.map((period) => period.order)) + 1 : 1
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          label: trimmedLabel,
          input: { ...snapshot },
          order: nextOrder,
          source,
        },
      ]
    })

    setMastermindNotice(`${trimmedLabel} saved to Mastermind timeline.`)
    return true
  }, [inputHasRequiredCoreValues])

  const removeMastermindPeriod = useCallback((periodId: string) => {
    const period = sortedMastermindPeriods.find((entry) => entry.id === periodId)
    if (!period) return

    setMastermindPeriods((prev) => prev.filter((entry) => entry.id !== periodId))
    setMastermindNotice('Period removed from timeline.')

    if (!activeBatchId || period.source !== 'import') return

    void (async () => {
      const removed = await removePLImportBatchItem(activeBatchId, periodId)
      if (removed.error) {
        setMastermindNotice(`Period removed locally, but server sync failed: ${removed.error}`)
        return
      }

      await refreshBatchState(activeBatchId)
      setMastermindNotice('Period removed and server timeline synced.')
    })()
  }, [activeBatchId, refreshBatchState, sortedMastermindPeriods])

  const loadMastermindPeriod = useCallback((periodId: string) => {
    const selected = sortedMastermindPeriods.find((period) => period.id === periodId)
    if (!selected) return
    setInput({ ...selected.input })
    setMastermindPeriodLabel(selected.label)
    setImportedFields(new Set())
    setMastermindNotice(`Loaded ${selected.label} into the form for editing.`)
  }, [sortedMastermindPeriods])

  const saveCurrentMastermindPeriod = useCallback(() => {
    const saved = upsertMastermindPeriod(mastermindPeriodLabel, input, 'manual')
    if (saved) {
      setMastermindPeriodLabel('')
      setImportedFields(new Set())
    }
  }, [input, mastermindPeriodLabel, upsertMastermindPeriod])

  const handleImportApply = useCallback((
    mappedInput: Partial<Record<PLImportNumericField, number>>,
    approval?: PLImportApprovalDto,
  ) => {
    const keys = Object.keys(mappedInput) as (keyof PLInput)[]
    if (keys.length === 0) return

    const nextInput = { ...input, ...(mappedInput as Partial<PLInput>) }
    setInput(nextInput)
    setImportedFields((prev) => {
      const next = new Set(prev)
      keys.forEach((key) => next.add(key))
      return next
    })

    if (programMode === 'mastermind') {
      const fallbackLabel = `Period ${sortedMastermindPeriods.length + 1}`
      const resolvedLabel = mastermindPeriodLabel.trim() || fallbackLabel
      const saved = upsertMastermindPeriod(resolvedLabel, nextInput, 'import')
      if (saved) {
        setMastermindPeriodLabel('')
      } else {
        setMastermindNotice('Imported values are loaded. Add period label and save to timeline.')
        return
      }

      if (!activeBatchId || !approval?.importId) return

      void (async () => {
        const response = await addPLImportBatchItem(activeBatchId, {
          importSessionId: approval.importId,
          periodLabel: resolvedLabel,
        })

        if (response.error) {
          setMastermindNotice(`Saved locally, but server sync failed: ${response.error}`)
          return
        }

        await refreshBatchState(activeBatchId)
        setMastermindNotice(`${resolvedLabel} synced to server timeline.`)
      })()
    }
  }, [
    activeBatchId,
    input,
    mastermindPeriodLabel,
    programMode,
    refreshBatchState,
    sortedMastermindPeriods.length,
    upsertMastermindPeriod,
  ])

  const isImportedField = useCallback((field: keyof PLInput) => importedFields.has(field), [importedFields])
  const isRequiredField = useCallback((field: keyof PLInput) => REQUIRED_CORE_FIELDS.includes(field), [])
  const getFieldError = useCallback(
    (field: keyof PLInput) => currentInputValidation.errorsByField[field]?.[0] || null,
    [currentInputValidation.errorsByField],
  )

  const inputGroupClass = useCallback((field: keyof PLInput) => (
    `pl-input-group ${isImportedField(field) ? 'pl-input-group-imported' : ''} ${getFieldError(field) ? 'pl-input-group-error' : ''}`
  ), [getFieldError, isImportedField])

  const renderInputLabel = useCallback((field: keyof PLInput, label: string) => (
    <label>
      {label}
      <span className="pl-input-badges">
        {isRequiredField(field) ? <span className="pl-required-pill">Required</span> : null}
        {isImportedField(field) ? <span className="pl-imported-pill">Imported</span> : null}
      </span>
    </label>
  ), [isImportedField, isRequiredField])
  const renderFieldError = useCallback((field: keyof PLInput) => {
    const message = getFieldError(field)
    if (!message) return null
    return <span className="pl-input-error">{message}</span>
  }, [getFieldError])

  const handleNext = async () => {
    if (currentStep === 2) {
      if (programMode === 'mastermind') {
        if (mastermindTimelineValidation.hasBlockingErrors) {
          setMastermindNotice(mastermindTimelineValidation.errors[0] || 'Resolve timeline issues before calculating.')
          return
        }
      } else if (currentInputValidation.hasBlockingErrors) {
        return
      }
    }

    if (
      currentStep === 2
      && programMode === 'mastermind'
      && isImportsEnabled
      && activeBatchId
      && sortedMastermindPeriods.length >= 2
      && sortedMastermindPeriods.every((period) => period.source === 'import')
    ) {
      setIsBatchSyncing(true)
      const approved = await approvePLImportBatch(activeBatchId)
      if (approved.error || !approved.approval) {
        setIsBatchSyncing(false)
        setMastermindNotice(approved.error || 'Failed to approve server timeline batch.')
        return
      }

      await refreshBatchState(activeBatchId)
      setActiveBatchStatus(approved.approval.batch.status)
      setIsBatchSyncing(false)
      setMastermindNotice(`Server timeline approved with ${approved.approval.timeline.length} period${approved.approval.timeline.length === 1 ? '' : 's'}.`)
    }

    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1)
      if (currentStep === 2) {
        hasLoggedResultRef.current = false
        setIsLoading(true)
        setTimeout(() => {
          setShowResults(true)
          setIsLoading(false)
        }, 800)
      }
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
      if (currentStep === 3) {
        setShowResults(false)
        hasLoggedResultRef.current = false
      }
    }
  }

  const handleExportPDF = async () => {
    if (!result) return
    setIsExporting(true)

    const greenCount = result.metrics.filter((metric) => metric.grade === 'green').length
    const yellowCount = result.metrics.filter((metric) => metric.grade === 'yellow').length
    const redCount = result.metrics.filter((metric) => metric.grade === 'red').length
    const score = typeof result.score === 'number' ? result.score : calculatePLScore(greenCount, yellowCount, redCount)
    const exportDate = new Date().toISOString().slice(0, 10)

    try {
      await generatePLReportPDF({
        result,
        coachName,
        clientName: clientName || 'Client',
        generatedOn: exportDate,
        programMode,
        scenarioRows,
        sensitivityRows,
        actionItems,
        input,
        mastermindPeriods: programMode === 'mastermind' ? sortedMastermindPeriods : undefined,
      })

      await Promise.all([
        logAction({
          actionType: 'pl_pdf_generated',
          description: `P&L PDF generated for ${clientName || 'Client'}`,
          sessionId,
          metadata: {
            score,
            overallGrade: result.overallGrade,
            coachName: coachName || null,
            clientName: clientName || null,
            benchmarkVersion: result.benchmarkVersion,
            confidence: result.confidence,
            calculatorMode: programMode,
            periodCount: programMode === 'mastermind' ? sortedMastermindPeriods.length : 1,
            warnings: result.warnings,
          },
        }),
        savePdfExport({
          sessionId,
          coachName,
          clientName: clientName || 'Client',
          callDate: new Date().toLocaleDateString(),
          score,
          metadata: {
            tool: 'pl_calculator',
            exportStyle: 'structured_jspdf',
            overallGrade: result.overallGrade,
            odi: result.odi,
            enterpriseValueLow: result.enterpriseValueLow,
            enterpriseValueHigh: result.enterpriseValueHigh,
            cashFlowSummary: result.cashFlowSummary,
            metrics: result.metrics,
            actionPlan: actionItems,
            benchmarkVersion: result.benchmarkVersion,
            confidence: result.confidence,
            calculatorMode: programMode,
            periodCount: programMode === 'mastermind' ? sortedMastermindPeriods.length : 1,
            mastermindPeriods: programMode === 'mastermind' ? sortedMastermindPeriods : undefined,
            warnings: result.warnings,
            input,
          },
        }),
      ])

      setShowExportModal(false)
    } catch (error) {
      console.error('Failed to generate structured P&L PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = actionItems.findIndex(i => i.id === active.id)
      const newIndex = actionItems.findIndex(i => i.id === over.id)
      const newItems = [...actionItems]
      const [moved] = newItems.splice(oldIndex, 1)
      newItems.splice(newIndex, 0, moved)
      setActionItems(newItems)
    }
  }

  const toggleActionItem = (id: string) => {
    setActionItems(items => items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }

  const formatPercent = (value: number) => `${value.toFixed(1)}%`
  const formatRatio = (value: number) => `${value.toFixed(2)}x`

  const getGradeLabel = (grade: string) => {
    return grade === 'green' ? 'Elite' : grade === 'yellow' ? 'Average' : 'Critical'
  }

  const formatMetricValue = (metric: MetricResult) => {
    if (metric.displayType === 'currency') return formatCurrency(metric.value)
    if (metric.displayType === 'ratio') return formatRatio(metric.value)
    if (metric.displayType === 'score') return `${metric.value.toFixed(1)} / 100`
    if (metric.displayType === 'count') return Math.round(metric.value).toString()
    return formatPercent(metric.value)
  }

  const getMetricGaugeMax = (metric: MetricResult) => {
    if (metric.displayType === 'currency') return 250
    if (metric.displayType === 'ratio') return 5
    if (metric.displayType === 'score' || metric.displayType === 'percent') return 100
    return Math.max(100, metric.value)
  }

  const scenarioRows = useMemo(() => {
    if (!showResults || programMode !== 'rainmaker' || !isV2Enabled || !result) return []
    return buildScenarioForecast(input)
  }, [input, isV2Enabled, programMode, result, showResults])

  const sensitivityRows = useMemo(() => {
    if (!showResults || programMode !== 'rainmaker' || !isV2Enabled || !result) return []
    return buildSensitivityLevers(input)
  }, [input, isV2Enabled, programMode, result, showResults])

  const canProceed = () => {
    if (currentStep === 1) return true
    if (currentStep === 2) {
      if (programMode === 'mastermind') return mastermindTimelineValidation.isReady
      return canRunRainmakerCalculation
    }
    return true
  }

  const canOpenExport = currentStep === 3 && showResults && !!result
  const coreMetrics = result?.coreMetrics || []
  const growthMetrics = result?.growthMetrics || []
  const operationalMetrics = result?.operationalMetrics || []

  return (
    <div className={`pl-calculator-page ${theme}`}>
      {showConfetti && <ReactConfetti numberOfPieces={150} recycle={false} gravity={0.2} />}

      <div className="pl-calculator-shell">
        <div className="pl-calculator-shell-topbar" aria-hidden="true">
          <span className="shell-dot shell-dot-red" />
          <span className="shell-dot shell-dot-yellow" />
          <span className="shell-dot shell-dot-green" />
          <span className="shell-title">PT Biz Financial Console</span>
        </div>

        {/* Header */}
        <motion.div
          className="pl-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="pl-header-content">
            <div className="pl-header-icon">
              <Calculator size={28} />
            </div>
            <div>
              <h1>P&L Grader</h1>
              <p>
                Financial health analysis for cash-based PT practices
                <span className="pl-version-pill">{isV2Enabled ? 'Benchmark v2' : 'Legacy model'}</span>
                <span className="pl-version-pill">{programMode === 'mastermind' ? 'Mastermind Track' : 'Rainmaker Track'}</span>
              </p>
            </div>
          </div>
          <div className="pl-header-actions">
            <button className="theme-toggle" onClick={() => setSoundEnabled(s => !s)} title="Toggle sound">
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="cmd-k-btn" onClick={toggleCommandPalette}>
              ⌘K
            </button>
          </div>
        </motion.div>

        {/* Stepper */}
        <div className="pl-stepper">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`stepper-item ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
              onClick={() => step.id < currentStep && setCurrentStep(step.id)}
            >
              <div className="stepper-number">
                {currentStep > step.id ? <CheckCircle2 size={16} /> : step.id}
              </div>
              <span className="stepper-label">{step.title}</span>
              {idx < steps.length - 1 && <div className="stepper-line" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
        {/* Step 1: Clinic DNA */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pl-step-content"
          >
            <div className="pl-section-card">
              <h3><Activity size={20} /> Clinic Profile</h3>
              <p className="pl-section-desc">Tell us about your practice structure</p>
              
              <div className="pl-form-grid">
                <div className="pl-input-group">
                  <label>Clinic Size</label>
                  <div className="pl-select-wrapper">
                    <select 
                      value={input.clinicSize}
                      onChange={(e) => handleInputChange('clinicSize', e.target.value)}
                    >
                      <option value="individual">Individual Clinician</option>
                      <option value="multi">Multi-Clinician</option>
                    </select>
                  </div>
                  <span className="pl-input-hint">Solo practitioner or team?</span>
                </div>

                <div className="pl-input-group">
                  <label>Business Model</label>
                  <div className="pl-select-wrapper">
                    <select 
                      value={input.clinicModel}
                      onChange={(e) => handleInputChange('clinicModel', e.target.value)}
                    >
                      <option value="cash">Cash-Based</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <span className="pl-input-hint">Out-of-network or insurance mix?</span>
                </div>

                <div className="pl-input-group">
                  <label>Stage</label>
                  <div className="pl-select-wrapper">
                    <select 
                      value={input.businessStage}
                      onChange={(e) => handleInputChange('businessStage', e.target.value)}
                    >
                      <option value="startup">Startup (0-2 years)</option>
                      <option value="growth">Growth Mode (2-5 years)</option>
                      <option value="maintenance">Maintenance (5+ years)</option>
                    </select>
                  </div>
                  <span className="pl-input-hint">Where are you in your journey?</span>
                </div>
              </div>

              <div className="pl-program-selector">
                <h4>Coaching Program Track</h4>
                <p className="pl-input-hint">Choose the scoring model aligned with clinic stage.</p>
                <div className="pl-program-cards">
                  <button
                    type="button"
                    className={`pl-program-card ${programMode === 'rainmaker' ? 'active' : ''}`}
                    onClick={() => {
                      setProgramMode('rainmaker')
                      setMastermindNotice(null)
                    }}
                  >
                    <strong>Clinical Rainmaker</strong>
                    <span>Newer clinics (0-12 months), single-period grading.</span>
                  </button>
                  <button
                    type="button"
                    className={`pl-program-card ${programMode === 'mastermind' ? 'active' : ''}`}
                    onClick={() => {
                      setProgramMode('mastermind')
                      setMastermindNotice(null)
                    }}
                  >
                    <strong>Mastermind Scale</strong>
                    <span>Established clinics (12+ months), multi-period trajectory grading.</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Financials */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pl-step-content"
          >
            <div className="pl-section-card">
              <h3><DollarSign size={20} /> Financial Data</h3>
              <p className="pl-section-desc">
                {programMode === 'mastermind'
                  ? 'Build a multi-period timeline for established clinic trajectory scoring.'
                  : 'Enter your trailing 12-month or 30-day numbers.'}
              </p>

              {isImportsEnabled ? (
                <div className="pl-import-callout">
                  <div>
                    <strong>{programMode === 'mastermind' ? 'Add Mastermind periods from files' : 'Need true multi-format intake?'}</strong>
                    <span>
                      {programMode === 'mastermind'
                        ? 'Import each period file (CSV/XLSX/PDF/image), confirm mapping, and save into your timeline.'
                        : 'Upload CSV, XLSX, PDF, or image files, confirm mappings, then hydrate this form.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="pl-import-trigger"
                    onClick={() => setShowImportDialog(true)}
                  >
                    <FileUp size={16} />
                    {programMode === 'mastermind' ? 'Import Period File' : 'Import P&L'}
                  </button>
                </div>
              ) : null}

              {programMode === 'mastermind' ? (
                <div className="pl-mastermind-panel">
                  <div className="pl-mastermind-header">
                    <h4>Mastermind Timeline Builder</h4>
                    <span>{sortedMastermindPeriods.length} period{sortedMastermindPeriods.length === 1 ? '' : 's'} saved</span>
                  </div>
                  <p className="pl-input-hint">
                    Save at least two periods for trajectory scoring. Use labels like FY2023, FY2024, or TTM 2025.
                  </p>
                  {isImportsEnabled ? (
                    <p className="pl-input-hint">
                      Server timeline: {activeBatchId ? `${activeBatchId.slice(0, 8)}…` : 'initializing'}
                      {activeBatchStatus ? ` · ${activeBatchStatus}` : ''}
                      {isBatchSyncing ? ' · syncing…' : ''}
                    </p>
                  ) : null}
                  <div className="pl-mastermind-controls">
                    <input
                      type="text"
                      placeholder="Period label"
                      value={mastermindPeriodLabel}
                      onChange={(event) => setMastermindPeriodLabel(event.target.value)}
                    />
                    <button
                      type="button"
                      className="pl-mastermind-btn secondary"
                      onClick={saveCurrentMastermindPeriod}
                    >
                      Save Current Period
                    </button>
                  </div>
                  {mastermindNotice ? <div className="pl-mastermind-notice">{mastermindNotice}</div> : null}
                  <div className="pl-mastermind-periods">
                    {sortedMastermindPeriods.length === 0 ? (
                      <div className="pl-mastermind-empty">No periods saved yet.</div>
                    ) : (
                      sortedMastermindPeriods.map((period) => (
                        <div key={period.id} className="pl-mastermind-period-card">
                          <div className="pl-mastermind-period-meta">
                            <strong>{period.label}</strong>
                            <span>
                              {formatCurrency(period.input.totalGrossRevenue)} · {Math.round(period.input.totalPatientVisits)} visits · {period.source}
                            </span>
                          </div>
                          <div className="pl-mastermind-period-actions">
                            <button
                              type="button"
                              className="pl-mastermind-btn ghost"
                              onClick={() => loadMastermindPeriod(period.id)}
                            >
                              Load
                            </button>
                            <button
                              type="button"
                              className="pl-mastermind-btn danger"
                              onClick={() => removeMastermindPeriod(period.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <div className="pl-validation-panel">
                <div className="pl-validation-header">
                  <strong>
                    {programMode === 'mastermind' ? 'Timeline Readiness' : 'Input Readiness'}
                  </strong>
                  <span>{currentInputValidation.requiredCompletion}% required core fields complete</span>
                </div>
                <div className="pl-validation-track" aria-hidden="true">
                  <span
                    className="pl-validation-fill"
                    style={{ width: `${currentInputValidation.requiredCompletion}%` }}
                  />
                </div>
                {programMode === 'mastermind' ? (
                  <p className="pl-input-hint">
                    {sortedMastermindPeriods.length} periods saved · {mastermindTimelineValidation.errors.length} blocking issue{mastermindTimelineValidation.errors.length === 1 ? '' : 's'}
                  </p>
                ) : null}
                {validationSummary.errors.length > 0 ? (
                  <ul className="pl-validation-list pl-validation-list-errors">
                    {validationSummary.errors.slice(0, 4).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                ) : null}
                {validationSummary.warnings.length > 0 ? (
                  <ul className="pl-validation-list pl-validation-list-warnings">
                    {validationSummary.warnings.slice(0, 3).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {programMode === 'rainmaker' ? (
                <div className="pl-guided-panel">
                  <div className="pl-guided-panel-header">
                    <div>
                      <strong>Data Entry Mode</strong>
                      <p className="pl-input-hint">
                        Guided flow unlocks sections in sequence. Power input keeps all fields editable.
                      </p>
                    </div>
                    <div className="pl-entry-mode-toggle" role="tablist" aria-label="Entry mode">
                      <button
                        type="button"
                        className={`pl-entry-mode-btn ${entryMode === 'guided' ? 'active' : ''}`}
                        onClick={() => setEntryMode('guided')}
                        role="tab"
                        aria-selected={entryMode === 'guided'}
                      >
                        Guided
                      </button>
                      <button
                        type="button"
                        className={`pl-entry-mode-btn ${entryMode === 'power' ? 'active' : ''}`}
                        onClick={() => setEntryMode('power')}
                        role="tab"
                        aria-selected={entryMode === 'power'}
                      >
                        Power
                      </button>
                    </div>
                  </div>

                  <div className="pl-guided-next-step" data-ready={canRunRainmakerCalculation ? 'ready' : 'pending'}>
                    <span className="pl-guided-next-label">
                      {canRunRainmakerCalculation ? 'Ready to calculate' : 'Next required input'}
                    </span>
                    <strong>
                      {canRunRainmakerCalculation
                        ? 'Core input checks are clear.'
                        : (nextRequiredFieldLabel || 'Resolve blocking inputs to continue.')}
                    </strong>
                    {!canRunRainmakerCalculation && validationSummary.errors.length > 0 ? (
                      <em>{validationSummary.errors[0]}</em>
                    ) : null}
                  </div>

                  {entryMode === 'guided' ? (
                    <div className="pl-guided-checklist">
                      {guidedSections.map((section) => (
                        <div
                          key={section.id}
                          className={`pl-guided-check-item ${section.isComplete ? 'complete' : ''} ${section.isUnlocked ? 'open' : 'locked'}`}
                        >
                          <div className="pl-guided-check-title">
                            {section.isComplete ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                            <span>{section.title}</span>
                            <strong>{section.completedCount}/{section.totalCount}</strong>
                          </div>
                          <p>{section.description}</p>
                          {!section.isComplete && section.isUnlocked && section.nextFieldLabel ? (
                            <em>Next: {section.nextFieldLabel}</em>
                          ) : null}
                          {!section.isUnlocked ? (
                            <em>Unlocks after the previous section is complete.</em>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="pl-input-hint">Power mode is best for rapid paste-in and reconciliation workflows.</p>
                  )}
                </div>
              ) : (
                <div className="pl-mastermind-checklist">
                  <div className="pl-guided-check-title">
                    <strong>Timeline checklist</strong>
                  </div>
                  <ul>
                    {mastermindChecklist.map((item) => (
                      <li key={item.id}>
                        {item.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p>{mastermindNextAction}</p>
                </div>
              )}

              <div className="pl-financials-grid">
                <div className={`pl-input-section ${isRevenueLocked ? 'is-locked' : ''}`}>
                  <h4>
                    <TrendingUp size={16} /> Revenue
                    {isGuidedRainmaker ? (
                      <span className={`pl-guided-section-pill ${revenueSectionState.isComplete ? 'complete' : 'active'}`}>
                        {revenueSectionState.isComplete ? 'Complete' : 'In Progress'}
                      </span>
                    ) : null}
                  </h4>
                  <fieldset className="pl-inputs-fieldset" disabled={isRevenueLocked}>
                    <div className="pl-inputs-row">
                      <div className={inputGroupClass('totalGrossRevenue')}>
                        {renderInputLabel('totalGrossRevenue', 'Total Gross Revenue')}
                        <div className="pl-currency-input">
                          <span>$</span>
                          <NumberFormatBase
                            placeholder="500,000"
                            value={input.totalGrossRevenue || ''}
                            onValueChange={(values) => handleInputChange('totalGrossRevenue', values.floatValue || 0)}
                          />
                        </div>
                        {renderFieldError('totalGrossRevenue')}
                      </div>
                      <div className={inputGroupClass('totalPatientVisits')}>
                        {renderInputLabel('totalPatientVisits', 'Patient Visits')}
                        <input 
                          type="number" 
                          placeholder="2,500"
                          value={input.totalPatientVisits || ''}
                          onChange={(e) => handleInputChange('totalPatientVisits', Number(e.target.value))}
                        />
                        {renderFieldError('totalPatientVisits')}
                      </div>
                      <div className={inputGroupClass('revenueFromContinuity')}>
                        {renderInputLabel('revenueFromContinuity', 'Continuity Revenue')}
                        <div className="pl-currency-input">
                          <span>$</span>
                          <NumberFormatBase
                            placeholder="150,000"
                            value={input.revenueFromContinuity || ''}
                            onValueChange={(values) => handleInputChange('revenueFromContinuity', values.floatValue || 0)}
                          />
                        </div>
                        {renderFieldError('revenueFromContinuity')}
                        <span className="pl-input-hint">Memberships, remote coaching, small group</span>
                      </div>
                    </div>
                  </fieldset>
                  {isRevenueLocked ? (
                    <span className="pl-section-lock-copy">Complete the previous section to unlock revenue inputs.</span>
                  ) : null}
                </div>

                <div className={`pl-input-section ${isExpensesLocked ? 'is-locked' : ''}`}>
                  <h4>
                    <Users size={16} /> Expenses
                    {isGuidedRainmaker ? (
                      <span className={`pl-guided-section-pill ${isExpensesLocked ? 'locked' : expensesSectionState.isComplete ? 'complete' : 'active'}`}>
                        {isExpensesLocked ? 'Locked' : expensesSectionState.isComplete ? 'Complete' : 'In Progress'}
                      </span>
                    ) : null}
                  </h4>
                  <fieldset className="pl-inputs-fieldset" disabled={isExpensesLocked}>
                    <div className="pl-inputs-row">
                      <div className={inputGroupClass('totalFacilityCosts')}>
                        {renderInputLabel('totalFacilityCosts', 'Facility Costs')}
                        <div className="pl-currency-input">
                          <span>$</span>
                          <NumberFormatBase
                            placeholder="40,000"
                            value={input.totalFacilityCosts || ''}
                            onValueChange={(values) => handleInputChange('totalFacilityCosts', values.floatValue || 0)}
                          />
                        </div>
                        {renderFieldError('totalFacilityCosts')}
                      </div>
                      <div className={inputGroupClass('totalStaffPayroll')}>
                        {renderInputLabel('totalStaffPayroll', 'Staff Payroll')}
                        <div className="pl-currency-input">
                          <span>$</span>
                          <NumberFormatBase
                            placeholder="180,000"
                            value={input.totalStaffPayroll || ''}
                            onValueChange={(values) => handleInputChange('totalStaffPayroll', values.floatValue || 0)}
                          />
                        </div>
                        {renderFieldError('totalStaffPayroll')}
                        <span className="pl-input-hint">Excluding owner</span>
                      </div>
                      <div className={inputGroupClass('totalOperatingExpenses')}>
                        {renderInputLabel('totalOperatingExpenses', 'Operating Expenses')}
                        <div className="pl-currency-input">
                          <span>$</span>
                          <NumberFormatBase
                            placeholder="350,000"
                            value={input.totalOperatingExpenses || ''}
                            onValueChange={(values) => handleInputChange('totalOperatingExpenses', values.floatValue || 0)}
                          />
                        </div>
                        {renderFieldError('totalOperatingExpenses')}
                      </div>
                    </div>
                  </fieldset>
                  {isExpensesLocked ? (
                    <span className="pl-section-lock-copy">Finish Revenue Foundation to unlock expenses.</span>
                  ) : null}
                </div>

                <div className={`pl-input-section ${isOwnerLocked ? 'is-locked' : ''}`}>
                  <h4>
                    <Sparkles size={16} /> Owner
                    {isGuidedRainmaker ? (
                      <span className={`pl-guided-section-pill ${isOwnerLocked ? 'locked' : ownerSectionState.isComplete ? 'complete' : 'active'}`}>
                        {isOwnerLocked ? 'Locked' : ownerSectionState.isComplete ? 'Complete' : 'In Progress'}
                      </span>
                    ) : null}
                  </h4>
                  <fieldset className="pl-inputs-fieldset" disabled={isOwnerLocked}>
                    <div className="pl-inputs-row">
                      <div className={inputGroupClass('ownerSalary')}>
                        {renderInputLabel('ownerSalary', 'Owner Salary')}
                        <div className="pl-currency-input">
                          <span>$</span>
                          <NumberFormatBase
                            placeholder="100,000"
                            value={input.ownerSalary || ''}
                            onValueChange={(values) => handleInputChange('ownerSalary', values.floatValue || 0)}
                          />
                        </div>
                        {renderFieldError('ownerSalary')}
                      </div>
                      <div className={inputGroupClass('ownerAddBacks')}>
                        {renderInputLabel('ownerAddBacks', 'Add-Backs')}
                        <div className="pl-currency-input">
                          <span>$</span>
                          <NumberFormatBase
                            placeholder="20,000"
                            value={input.ownerAddBacks || ''}
                            onValueChange={(values) => handleInputChange('ownerAddBacks', values.floatValue || 0)}
                          />
                        </div>
                        {renderFieldError('ownerAddBacks')}
                        <span className="pl-input-hint">Vehicle, insurance, CE, etc.</span>
                      </div>
                    </div>
                  </fieldset>
                  {isOwnerLocked ? (
                    <span className="pl-section-lock-copy">Finish Expense Structure to unlock owner economics.</span>
                  ) : null}
                </div>

                <div className="pl-advanced-section">
                  <button
                    type="button"
                    className="pl-advanced-toggle"
                    onClick={() => setShowAdvancedInputs((open) => !open)}
                    disabled={!canOpenAdvancedInputs}
                  >
                    <span>Advanced Inputs (Optional)</span>
                    <span>{showAdvancedInputs ? 'Hide' : 'Show'}</span>
                  </button>

                  {!canOpenAdvancedInputs ? (
                    <span className="pl-input-hint">
                      Complete all required core fields to unlock advanced inputs in guided mode.
                    </span>
                  ) : null}

                  {showAdvancedInputs && (
                    <div className="pl-advanced-grid">
                      <div className="pl-input-section">
                        <h4><TrendingUp size={16} /> Revenue Stratification</h4>
                        <div className="pl-inputs-row">
                          <div className={inputGroupClass('frontEndRevenue')}>
                            {renderInputLabel('frontEndRevenue', 'Front-End Revenue')}
                            <div className="pl-currency-input">
                              <span>$</span>
                              <NumberFormatBase
                                placeholder="250,000"
                                value={input.frontEndRevenue ?? ''}
                                onValueChange={(values) => handleInputChange('frontEndRevenue', values.floatValue || 0)}
                              />
                            </div>
                          </div>
                          <div className={inputGroupClass('tertiaryRevenue')}>
                            {renderInputLabel('tertiaryRevenue', 'Tertiary Revenue')}
                            <div className="pl-currency-input">
                              <span>$</span>
                              <NumberFormatBase
                                placeholder="50,000"
                                value={input.tertiaryRevenue ?? ''}
                                onValueChange={(values) => handleInputChange('tertiaryRevenue', values.floatValue || 0)}
                              />
                            </div>
                          </div>
                          <div className={inputGroupClass('activeContinuityMembers')}>
                            {renderInputLabel('activeContinuityMembers', 'Active Continuity Members')}
                            <input
                              type="number"
                              placeholder="40"
                              value={input.activeContinuityMembers ?? ''}
                              onChange={(e) => handleInputChange('activeContinuityMembers', Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pl-input-section">
                        <h4><Users size={16} /> Detailed Expenses</h4>
                        <div className="pl-inputs-row">
                          <div className={inputGroupClass('marketingSpend')}>
                            {renderInputLabel('marketingSpend', 'Marketing Spend')}
                            <div className="pl-currency-input">
                              <span>$</span>
                              <NumberFormatBase
                                placeholder="45,000"
                                value={input.marketingSpend ?? ''}
                                onValueChange={(values) => handleInputChange('marketingSpend', values.floatValue || 0)}
                              />
                            </div>
                          </div>
                          <div className={inputGroupClass('techAdminSpend')}>
                            {renderInputLabel('techAdminSpend', 'Tech/Admin Spend')}
                            <div className="pl-currency-input">
                              <span>$</span>
                              <NumberFormatBase
                                placeholder="18,000"
                                value={input.techAdminSpend ?? ''}
                                onValueChange={(values) => handleInputChange('techAdminSpend', values.floatValue || 0)}
                              />
                            </div>
                          </div>
                          <div className={inputGroupClass('merchantFees')}>
                            {renderInputLabel('merchantFees', 'Merchant Fees')}
                            <div className="pl-currency-input">
                              <span>$</span>
                              <NumberFormatBase
                                placeholder="12,000"
                                value={input.merchantFees ?? ''}
                                onValueChange={(values) => handleInputChange('merchantFees', values.floatValue || 0)}
                              />
                            </div>
                          </div>
                          <div className={inputGroupClass('retailCOGS')}>
                            {renderInputLabel('retailCOGS', 'Retail COGS')}
                            <div className="pl-currency-input">
                              <span>$</span>
                              <NumberFormatBase
                                placeholder="7,500"
                                value={input.retailCOGS ?? ''}
                                onValueChange={(values) => handleInputChange('retailCOGS', values.floatValue || 0)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pl-input-section">
                        <h4><Activity size={16} /> Growth KPIs</h4>
                        <div className="pl-inputs-row">
                          <div className={inputGroupClass('leadCount')}>
                            {renderInputLabel('leadCount', 'Lead Count')}
                            <input
                              type="number"
                              placeholder="180"
                              value={input.leadCount ?? ''}
                              onChange={(e) => handleInputChange('leadCount', Number(e.target.value))}
                            />
                          </div>
                          <div className={inputGroupClass('evaluationsBooked')}>
                            {renderInputLabel('evaluationsBooked', 'Evaluations Booked')}
                            <input
                              type="number"
                              placeholder="95"
                              value={input.evaluationsBooked ?? ''}
                              onChange={(e) => handleInputChange('evaluationsBooked', Number(e.target.value))}
                            />
                          </div>
                          <div className={inputGroupClass('packagesClosed')}>
                            {renderInputLabel('packagesClosed', 'Packages Closed')}
                            <input
                              type="number"
                              placeholder="70"
                              value={input.packagesClosed ?? ''}
                              onChange={(e) => handleInputChange('packagesClosed', Number(e.target.value))}
                            />
                          </div>
                          <div className={inputGroupClass('npsScore')}>
                            {renderInputLabel('npsScore', 'NPS')}
                            <input
                              type="number"
                              step="0.1"
                              placeholder="9.2"
                              value={input.npsScore ?? ''}
                              onChange={(e) => handleInputChange('npsScore', Number(e.target.value))}
                            />
                          </div>
                          <div className={inputGroupClass('patientLTV')}>
                            {renderInputLabel('patientLTV', 'Patient LTV')}
                            <div className="pl-currency-input">
                              <span>$</span>
                              <NumberFormatBase
                                placeholder="2,200"
                                value={input.patientLTV ?? ''}
                                onValueChange={(values) => handleInputChange('patientLTV', values.floatValue || 0)}
                              />
                            </div>
                          </div>
                          <div className={inputGroupClass('patientAcquisitionCost')}>
                            {renderInputLabel('patientAcquisitionCost', 'Patient Acquisition Cost')}
                            <div className="pl-currency-input">
                              <span>$</span>
                              <NumberFormatBase
                                placeholder="550"
                                value={input.patientAcquisitionCost ?? ''}
                                onValueChange={(values) => handleInputChange('patientAcquisitionCost', values.floatValue || 0)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Results */}
        {currentStep === 3 && showResults && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95, rotateX: 8 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            className="pl-step-content"
          >
            {isLoading ? (
              <div className="pl-results-loading">
                <div className="loading-skeleton-grid">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="skeleton-card" />)}
                </div>
              </div>
            ) : (
              <div className="pl-results-container">
                {/* Results Header */}
                <div className="pl-results-header">
                  <div className="pl-report-meta-inputs">
                    <input 
                      type="text" 
                      placeholder="Coach Name"
                      value={coachName}
                      onChange={(e) => setCoachName(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Client Name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>
                  <motion.button 
                    className="pl-export-btn"
                    onClick={() => setShowExportModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download size={16} /> Export
                  </motion.button>
                </div>

                {/* Report Card */}
                <div className="pl-report">
                  <div className="pl-report-header">
                    <div className="pl-report-logo">
                      <img src={SITE_LOGO_URL} alt="PT Biz" />
                    </div>
                    <div className="pl-report-meta">
                      {coachName && <span>Coach: {coachName}</span>}
                      {clientName && <span>Client: {clientName}</span>}
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Overall Grade */}
                  <motion.div 
                    className="pl-overall-grade"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="grade-badge-large" data-grade={result?.overallGrade}>
                      {result?.overallGrade === 'green' ? <Sparkles size={24} /> : null}
                      {getGradeLabel(result?.overallGrade || 'red')}
                    </div>
                    <h2>{programMode === 'mastermind' ? 'Scale Trajectory Score' : 'Financial Health Score'}: {result?.score ?? 0}</h2>
                  </motion.div>

                  <div className="pl-benchmark-row">
                    <span>Benchmark Version: {result?.benchmarkVersion || 'legacy'}</span>
                    <span>Confidence: {result?.confidence ?? 0}%</span>
                    <span>Composite Score: {result?.score ?? 0}</span>
                  </div>

                  {result?.warnings?.length ? (
                    <div className="pl-warning-panel">
                      <h4>Data Quality Warnings</h4>
                      <ul>
                        {result.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {scenarioRows.length > 0 ? (
                    <div className="pl-scenario-section">
                      <h3>Scenario Forecast</h3>
                      <div className="pl-scenario-grid">
                        {scenarioRows.map((scenario) => (
                          <div key={scenario.name} className="pl-scenario-card" data-grade={scenario.grade}>
                            <span>{scenario.name}</span>
                            <strong>Score {scenario.score}</strong>
                            <em>ODI {formatCurrency(scenario.odi)}</em>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {sensitivityRows.length > 0 ? (
                    <div className="pl-sensitivity-section">
                      <h3>Highest-Impact Levers</h3>
                      <div className="pl-sensitivity-list">
                        {sensitivityRows.map((entry) => (
                          <div key={entry.label} className="pl-sensitivity-row">
                            <span>{entry.label}</span>
                            <strong className={entry.scoreDelta >= 0 ? 'positive' : 'negative'}>
                              {entry.scoreDelta >= 0 ? '+' : ''}{entry.scoreDelta} score
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Grouped Metric Tiles */}
                  {[
                    { key: 'core', title: 'Core Financial Health', metrics: coreMetrics },
                    { key: 'growth', title: 'Growth KPIs', metrics: growthMetrics },
                    { key: 'operational', title: 'Operational Efficiency', metrics: operationalMetrics },
                  ].map((section, sectionIndex) => (
                    section.metrics.length > 0 ? (
                      <div key={section.key} className="pl-metric-group">
                        <h3>{section.title}</h3>
                        <div className="pl-metrics-grid">
                          {section.metrics.map((metric, metricIndex) => (
                            <motion.div
                              key={metric.id}
                              className="pl-metric-tile"
                              initial={{ opacity: 0, y: 40 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.08 + sectionIndex * 0.15 + metricIndex * 0.05 }}
                              data-grade={metric.grade}
                            >
                              <div className="tile-header">
                                <RadialProgress
                                  value={metric.value}
                                  max={getMetricGaugeMax(metric)}
                                  grade={metric.grade}
                                />
                                <Sparkline data={metric.trend} color={GRADE_COLORS[metric.grade]} />
                              </div>
                              <div className="tile-content">
                                <span className="tile-name">{metric.name}</span>
                                <span className="tile-value">{formatMetricValue(metric)}</span>
                                <span className="tile-threshold">Band: {metric.threshold}</span>
                              </div>
                              <Tooltip content={metric.tip}>
                                <div className="tile-tip">?</div>
                              </Tooltip>
                              <p className="tile-diagnostic">{metric.diagnostic}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  ))}

                  {/* ODI Section */}
                  <motion.div 
                    className="pl-odi-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h3>Enterprise Value (ODI)</h3>
                    <div className="odi-display">
                      <div className="odi-value">{formatCurrency(result?.odi || 0)}</div>
                      <div className="valuation-range">
                        <span>Enterprise Value:</span>
                        <strong>{formatCurrency(result?.enterpriseValueLow || 0)} — {formatCurrency(result?.enterpriseValueHigh || 0)}</strong>
                      </div>
                    </div>
                  </motion.div>

                  {/* Cash Flow */}
                  <motion.div 
                    className="pl-cashflow-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <h3>Cash Flow Analysis</h3>
                    <p>{result?.cashFlowSummary}</p>
                  </motion.div>

                  {/* Kanban Action Plan */}
                  <motion.div 
                    className="pl-actionplan-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <h3>90-Day Action Plan</h3>
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <div className="kanban-board">
                        <KanbanColumn 
                          phase={1} 
                          title="Week 1-30" 
                          items={actionItems.filter(i => i.phase === 1)} 
                          onToggle={toggleActionItem}
                        />
                        <KanbanColumn 
                          phase={2} 
                          title="Week 31-60" 
                          items={actionItems.filter(i => i.phase === 2)} 
                          onToggle={toggleActionItem}
                        />
                        <KanbanColumn 
                          phase={3} 
                          title="Week 61-90" 
                          items={actionItems.filter(i => i.phase === 3)} 
                          onToggle={toggleActionItem}
                        />
                      </div>
                    </DndContext>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        {/* Navigation */}
        {currentStep < 3 && (
          <motion.div
            className="pl-nav"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              className="pl-nav-btn secondary"
              onClick={handlePrev}
              disabled={currentStep === 1}
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button
              className="pl-nav-btn primary"
              onClick={handleNext}
              disabled={!canProceed() || isBatchSyncing}
            >
              {isBatchSyncing && currentStep === 2 && programMode === 'mastermind'
                ? 'Syncing Timeline'
                : currentStep === 2
                ? (programMode === 'mastermind' ? 'Calculate Trajectory' : 'Calculate')
                : 'Next'} <ArrowRight size={18} />
            </button>
          </motion.div>
        )}
      </div>

      {/* Export Modal */}
      <AnimatePresence>
        {showQuickActions && (
          <CorexDialog
            open={showQuickActions}
            onOpenChange={(open) => setShowQuickActions(open)}
            title="Quick Actions"
            description="Keyboard shortcut: Cmd/Ctrl + K"
            size="md"
          >
            <div className="export-modal-body">
              <div className="export-options">
                <CorexButton
                  variant="secondary"
                  onClick={() => {
                    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
                    setShowQuickActions(false)
                  }}
                >
                  {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </CorexButton>
                <CorexButton
                  variant="secondary"
                  onClick={() => {
                    setSoundEnabled((s) => !s)
                    setShowQuickActions(false)
                  }}
                >
                  {soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
                </CorexButton>
                <CorexButton
                  variant="primary"
                  disabled={!canOpenExport}
                  onClick={() => {
                    if (!canOpenExport) return
                    setShowQuickActions(false)
                    setShowExportModal(true)
                  }}
                >
                  Open Export Dialog
                </CorexButton>
              </div>
            </div>
          </CorexDialog>
        )}
        {showExportModal && (
          <CorexDialog
            open={showExportModal}
            onOpenChange={(open) => setShowExportModal(open)}
            title="Export Report"
          >
            <div className="export-modal-body">
              <div className="export-filename">
                <label>Filename</label>
                <input 
                  type="text" 
                  value={`PT-Biz-PL-Report-${clientName || 'Client'}.pdf`}
                  readOnly
                />
              </div>
              <div className="export-options">
                <CorexButton 
                  variant="primary" 
                  onClick={handleExportPDF} 
                  loading={isExporting}
                >
                  <Download size={18} />
                  {isExporting ? 'Generating...' : 'Download PDF'}
                </CorexButton>
              </div>
            </div>
          </CorexDialog>
        )}
      </AnimatePresence>

      {isImportsEnabled ? (
        <PLImportDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onApplyMappedInput={handleImportApply}
        />
      ) : null}
    </div>
  )
}
