import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, Download, DollarSign, TrendingUp, Users, Activity, ArrowRight, ArrowLeft, Sun, Moon, Sparkles, Target, CheckCircle2, Circle, GripVertical, Volume2, VolumeX } from 'lucide-react'
import { NumberFormatBase } from 'react-number-format'
import { usePLGrader } from '../utils/usePLGrader'
import type { PLInput } from '../utils/plTypes'
import { GRADE_COLORS } from '../utils/plTypes'
import ReactConfetti from 'react-confetti'
import { useKBar } from 'kbar'
import { DndContext, closestCenter } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CorexDialog, CorexButton } from '../components/corex/CorexComponents'
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
  ownerAddBacks: 0
}

const steps = [
  { id: 1, title: 'Clinic DNA', icon: Activity },
  { id: 2, title: 'Financials', icon: DollarSign },
  { id: 3, title: 'Report Card', icon: Target }
]

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
      <span className={`action-card-text ${item.completed ? 'completed' : ''}`}>{item.text}</span>
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

export default function PLCalculator() {
  const [input, setInput] = useState<PLInput>(initialInput)
  const [currentStep, setCurrentStep] = useState(1)
  const [showResults, setShowResults] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [clientName, setClientName] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isExporting, setIsExporting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [actionItems, setActionItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const reportRef = useRef<HTMLDivElement>(null)
  const { query } = useKBar()
  const { playEliteSound, playCriticalSound } = useSoundEffects(soundEnabled)

  const result = usePLGrader(showResults ? input : null)

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        query.toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [query])

  const handleInputChange = (field: keyof PLInput, value: string | number) => {
    setInput(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1)
      if (currentStep === 2) {
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
      if (currentStep === 3) setShowResults(false)
    }
  }

  const handleExportPDF = async () => {
    if (!reportRef.current) return
    setIsExporting(true)

    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).default

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: theme === 'dark' ? '#0a0a0f' : '#ffffff',
      logging: false
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`PT-Biz-PL-Report-${clientName || 'Client'}.pdf`)
    setIsExporting(false)
    setShowExportModal(false)
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

  const getGradeLabel = (grade: string) => {
    return grade === 'green' ? 'Elite' : grade === 'yellow' ? 'Average' : 'Critical'
  }

  const canProceed = () => {
    if (currentStep === 1) return true
    if (currentStep === 2) return input.totalGrossRevenue > 0 && input.totalPatientVisits > 0
    return true
  }

  return (
    <div className={`pl-calculator-page ${theme}`}>
      {showConfetti && <ReactConfetti numberOfPieces={150} recycle={false} gravity={0.2} />}
      
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
            <p>Financial health analysis for cash-based PT practices</p>
          </div>
        </div>
        <div className="pl-header-actions">
          <button className="theme-toggle" onClick={() => setSoundEnabled(s => !s)} title="Toggle sound">
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="cmd-k-btn" onClick={query.toggle}>
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
              <p className="pl-section-desc">Enter your trailing 12-month or 30-day numbers</p>

              <div className="pl-financials-grid">
                <div className="pl-input-section">
                  <h4><TrendingUp size={16} /> Revenue</h4>
                  <div className="pl-inputs-row">
                    <div className="pl-input-group">
                      <label>Total Gross Revenue</label>
                      <div className="pl-currency-input">
                        <span>$</span>
                        <NumberFormatBase
                          placeholder="500,000"
                          value={input.totalGrossRevenue || ''}
                          onValueChange={(values) => handleInputChange('totalGrossRevenue', values.floatValue || 0)}
                        />
                      </div>
                    </div>
                    <div className="pl-input-group">
                      <label>Patient Visits</label>
                      <input 
                        type="number" 
                        placeholder="2,500"
                        value={input.totalPatientVisits || ''}
                        onChange={(e) => handleInputChange('totalPatientVisits', Number(e.target.value))}
                      />
                    </div>
                    <div className="pl-input-group">
                      <label>Continuity Revenue</label>
                      <div className="pl-currency-input">
                        <span>$</span>
                        <NumberFormatBase
                          placeholder="150,000"
                          value={input.revenueFromContinuity || ''}
                          onValueChange={(values) => handleInputChange('revenueFromContinuity', values.floatValue || 0)}
                        />
                      </div>
                      <span className="pl-input-hint">Memberships, remote coaching, small group</span>
                    </div>
                  </div>
                </div>

                <div className="pl-input-section">
                  <h4><Users size={16} /> Expenses</h4>
                  <div className="pl-inputs-row">
                    <div className="pl-input-group">
                      <label>Facility Costs</label>
                      <div className="pl-currency-input">
                        <span>$</span>
                        <NumberFormatBase
                          placeholder="40,000"
                          value={input.totalFacilityCosts || ''}
                          onValueChange={(values) => handleInputChange('totalFacilityCosts', values.floatValue || 0)}
                        />
                      </div>
                    </div>
                    <div className="pl-input-group">
                      <label>Staff Payroll</label>
                      <div className="pl-currency-input">
                        <span>$</span>
                        <NumberFormatBase
                          placeholder="180,000"
                          value={input.totalStaffPayroll || ''}
                          onValueChange={(values) => handleInputChange('totalStaffPayroll', values.floatValue || 0)}
                        />
                      </div>
                      <span className="pl-input-hint">Excluding owner</span>
                    </div>
                    <div className="pl-input-group">
                      <label>Operating Expenses</label>
                      <div className="pl-currency-input">
                        <span>$</span>
                        <NumberFormatBase
                          placeholder="350,000"
                          value={input.totalOperatingExpenses || ''}
                          onValueChange={(values) => handleInputChange('totalOperatingExpenses', values.floatValue || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pl-input-section">
                  <h4><Sparkles size={16} /> Owner</h4>
                  <div className="pl-inputs-row">
                    <div className="pl-input-group">
                      <label>Owner Salary</label>
                      <div className="pl-currency-input">
                        <span>$</span>
                        <NumberFormatBase
                          placeholder="100,000"
                          value={input.ownerSalary || ''}
                          onValueChange={(values) => handleInputChange('ownerSalary', values.floatValue || 0)}
                        />
                      </div>
                    </div>
                    <div className="pl-input-group">
                      <label>Add-Backs</label>
                      <div className="pl-currency-input">
                        <span>$</span>
                        <NumberFormatBase
                          placeholder="20,000"
                          value={input.ownerAddBacks || ''}
                          onValueChange={(values) => handleInputChange('ownerAddBacks', values.floatValue || 0)}
                        />
                      </div>
                      <span className="pl-input-hint">Vehicle, insurance, CE, etc.</span>
                    </div>
                  </div>
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
                <div className="pl-report" ref={reportRef}>
                  <div className="pl-report-header">
                    <div className="pl-report-logo">PT Biz</div>
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
                    <h2>Financial Health Score</h2>
                  </motion.div>

                  {/* Living Tiles */}
                  <div className="pl-metrics-grid">
                    {result?.metrics.map((metric, index) => (
                      <motion.div 
                        key={metric.id}
                        className="pl-metric-tile"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.08 }}
                        data-grade={metric.grade}
                      >
                        <div className="tile-header">
                          <RadialProgress 
                            value={metric.name.includes('%') ? metric.value : metric.value} 
                            max={metric.name.includes('%') ? 100 : metric.name.includes('Revenue') ? 50 : 30}
                            grade={metric.grade}
                          />
                          <Sparkline data={metric.trend} color={GRADE_COLORS[metric.grade]} />
                        </div>
                        <div className="tile-content">
                          <span className="tile-name">{metric.name}</span>
                          <span className="tile-value">
                            {metric.name.includes('Ratio') || metric.name.includes('%') || metric.name.includes('Margin') 
                              ? formatPercent(metric.value) 
                              : formatCurrency(metric.value)}
                          </span>
                          <span className="tile-threshold">Target: {metric.threshold}</span>
                        </div>
                        <Tooltip content={metric.tip}>
                          <div className="tile-tip">?</div>
                        </Tooltip>
                        <p className="tile-diagnostic">{metric.diagnostic}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* ODI Section */}
                  <motion.div 
                    className="pl-odi-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h3>Owner's Discretionary Income (ODI)</h3>
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
            disabled={!canProceed()}
          >
            {currentStep === 2 ? 'Calculate' : 'Next'} <ArrowRight size={18} />
          </button>
        </motion.div>
      )}

      {/* Export Modal */}
      <AnimatePresence>
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
    </div>
  )
}
