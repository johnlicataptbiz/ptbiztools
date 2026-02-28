import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, Download, DollarSign, TrendingUp, Users, Activity, ArrowRight } from 'lucide-react'
import { usePLGrader } from '../utils/usePLGrader'
import type { PLInput } from '../utils/plTypes'
import './PLCalculator.css'

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

export default function PLCalculator() {
  const [input, setInput] = useState<PLInput>(initialInput)
  const [showResults, setShowResults] = useState(false)
  const [coachName, setCoachName] = useState('')
  const [clientName, setClientName] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)
  
  const result = usePLGrader(showResults ? input : null)

  const handleInputChange = (field: keyof PLInput, value: string | number) => {
    setInput(prev => ({ ...prev, [field]: value }))
  }

  const handleCalculate = () => {
    if (input.totalGrossRevenue > 0 && input.totalPatientVisits > 0) {
      setShowResults(true)
    }
  }

  const handleExportPDF = async () => {
    if (!reportRef.current || !result) return

    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).default

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: '#0a0a0f',
      logging: false
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`PT-Biz-PL-Report-${clientName || 'Client'}.pdf`)
  }

  const getGradeColor = (grade: 'green' | 'yellow' | 'red') => {
    switch (grade) {
      case 'green': return 'var(--color-success)'
      case 'yellow': return 'var(--color-warning)'
      case 'red': return 'var(--color-error)'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="pl-calculator-page">
      <div className="pl-container">
        <motion.div 
          className="pl-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="pl-header-icon">
            <Calculator size={32} />
          </div>
          <div>
            <h1>P&L Grader</h1>
            <p>Financial health analysis for cash-based PT practices</p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div 
              key="input-form"
              className="pl-form-container"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Profile Section */}
              <div className="pl-section">
                <h3><Activity size={18} /> Clinic Profile</h3>
                <div className="pl-profile-grid">
                  <div className="pl-input-group">
                    <label>Clinic Size</label>
                    <select 
                      value={input.clinicSize}
                      onChange={(e) => handleInputChange('clinicSize', e.target.value)}
                    >
                      <option value="individual">Individual Clinician</option>
                      <option value="multi">Multi-Clinician</option>
                    </select>
                  </div>
                  <div className="pl-input-group">
                    <label>Business Model</label>
                    <select 
                      value={input.clinicModel}
                      onChange={(e) => handleInputChange('clinicModel', e.target.value)}
                    >
                      <option value="cash">Cash-Based</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="pl-input-group">
                    <label>Stage</label>
                    <select 
                      value={input.businessStage}
                      onChange={(e) => handleInputChange('businessStage', e.target.value)}
                    >
                      <option value="startup">Startup</option>
                      <option value="growth">Growth Mode</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Revenue Section */}
              <div className="pl-section">
                <h3><DollarSign size={18} /> Revenue (TTM)</h3>
                <div className="pl-inputs-grid">
                  <div className="pl-input-group">
                    <label>Total Gross Revenue</label>
                    <div className="pl-currency-input">
                      <span>$</span>
                      <input 
                        type="number" 
                        placeholder="500000"
                        value={input.totalGrossRevenue || ''}
                        onChange={(e) => handleInputChange('totalGrossRevenue', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="pl-input-group">
                    <label>Total Patient Visits</label>
                    <input 
                      type="number" 
                      placeholder="2500"
                      value={input.totalPatientVisits || ''}
                      onChange={(e) => handleInputChange('totalPatientVisits', Number(e.target.value))}
                    />
                  </div>
                  <div className="pl-input-group">
                    <label>Revenue from Continuity</label>
                    <div className="pl-currency-input">
                      <span>$</span>
                      <input 
                        type="number" 
                        placeholder="150000"
                        value={input.revenueFromContinuity || ''}
                        onChange={(e) => handleInputChange('revenueFromContinuity', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div className="pl-section">
                <h3><TrendingUp size={18} /> Operating Expenses</h3>
                <div className="pl-inputs-grid">
                  <div className="pl-input-group">
                    <label>Total Facility Costs</label>
                    <div className="pl-currency-input">
                      <span>$</span>
                      <input 
                        type="number" 
                        placeholder="40000"
                        value={input.totalFacilityCosts || ''}
                        onChange={(e) => handleInputChange('totalFacilityCosts', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="pl-input-group">
                    <label>Total Staff Payroll</label>
                    <div className="pl-currency-input">
                      <span>$</span>
                      <input 
                        type="number" 
                        placeholder="180000"
                        value={input.totalStaffPayroll || ''}
                        onChange={(e) => handleInputChange('totalStaffPayroll', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="pl-input-group">
                    <label>Total Operating Expenses</label>
                    <div className="pl-currency-input">
                      <span>$</span>
                      <input 
                        type="number" 
                        placeholder="350000"
                        value={input.totalOperatingExpenses || ''}
                        onChange={(e) => handleInputChange('totalOperatingExpenses', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Section */}
              <div className="pl-section">
                <h3><Users size={18} /> Owner Compensation</h3>
                <div className="pl-inputs-grid">
                  <div className="pl-input-group">
                    <label>Owner Salary</label>
                    <div className="pl-currency-input">
                      <span>$</span>
                      <input 
                        type="number" 
                        placeholder="100000"
                        value={input.ownerSalary || ''}
                        onChange={(e) => handleInputChange('ownerSalary', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="pl-input-group">
                    <label>Owner Add-Backs</label>
                    <div className="pl-currency-input">
                      <span>$</span>
                      <input 
                        type="number" 
                        placeholder="20000"
                        value={input.ownerAddBacks || ''}
                        onChange={(e) => handleInputChange('ownerAddBacks', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <motion.button 
                className="pl-calculate-btn"
                onClick={handleCalculate}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!input.totalGrossRevenue || !input.totalPatientVisits}
              >
                Calculate Results <ArrowRight size={20} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              className="pl-results-container"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="pl-results-header">
                <button className="pl-edit-btn" onClick={() => setShowResults(false)}>
                  ← Edit Inputs
                </button>
                <div className="pl-export-form">
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
                  <motion.button 
                    className="pl-export-btn"
                    onClick={handleExportPDF}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download size={16} /> Export PDF
                  </motion.button>
                </div>
              </div>

              <div className="pl-report" ref={reportRef}>
                <div className="pl-report-header">
                  <div className="pl-report-logo">PT Biz</div>
                  <div className="pl-report-meta">
                    {coachName && <span>Coach: {coachName}</span>}
                    {clientName && <span>Client: {clientName}</span>}
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pl-overall-grade">
                  <div className="pl-grade-badge" data-grade={result?.overallGrade}>
                    {result?.overallGrade === 'green' ? 'Elite' : result?.overallGrade === 'yellow' ? 'Average' : 'Needs Work'}
                  </div>
                  <h2>Financial Health Score</h2>
                </div>

                <div className="pl-metrics-grid">
                  {result?.metrics.map((metric, index) => (
                    <motion.div 
                      key={metric.name}
                      className="pl-metric-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="pl-metric-header">
                        <span className="pl-metric-name">{metric.name}</span>
                        <span className="pl-metric-grade" style={{ backgroundColor: getGradeColor(metric.grade) }}>
                          {metric.grade === 'green' ? 'Elite' : metric.grade === 'yellow' ? 'Avg' : 'Critical'}
                        </span>
                      </div>
                      <div className="pl-metric-value">
                        {metric.name.includes('Ratio') || metric.name.includes('Burden') || metric.name.includes('Margin') 
                          ? formatPercent(metric.value) 
                          : formatCurrency(metric.value)}
                      </div>
                      <div className="pl-metric-threshold">Target: {metric.threshold}</div>
                      <p className="pl-metric-diagnostic">{metric.diagnostic}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="pl-odi-section">
                  <h3>Owner's Discretionary Income (ODI)</h3>
                  <div className="pl-odi-value">{formatCurrency(result?.odi || 0)}</div>
                  <div className="pl-valuation">
                    <span>Enterprise Valuation:</span>
                    <strong>{formatCurrency(result?.enterpriseValueLow || 0)} - {formatCurrency(result?.enterpriseValueHigh || 0)}</strong>
                  </div>
                </div>

                <div className="pl-cashflow-section">
                  <h3>Cash Flow Analysis</h3>
                  <p>{result?.cashFlowSummary}</p>
                </div>

                <div className="pl-actionplan-section">
                  <h3>90-Day Action Plan</h3>
                  <ol>
                    {result?.actionPlan.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
