import { DISCOVERY_PDF_LOGO_WHITE_URL } from '../constants/branding'
import type { MastermindPeriod } from './pl/mastermindEngine'
import type { ScenarioRow, SensitivityRow } from './pl/scenario'
import type { ActionItem, MetricResult, PLInput, PLResult } from './plTypes'

type ProgramMode = 'rainmaker' | 'mastermind'

interface PLPdfOptions {
  result: PLResult
  coachName: string
  clientName: string
  generatedOn: string
  programMode: ProgramMode
  scenarioRows: ScenarioRow[]
  sensitivityRows: SensitivityRow[]
  actionItems: ActionItem[]
  input: PLInput
  mastermindPeriods?: MastermindPeriod[]
}

const COLORS = {
  headerBg: '#10142a',
  textDark: '#1f2937',
  textMuted: '#4b5563',
  line: '#d1d5db',
  surface: '#f8fafc',
  accentBlue: '#1d4ed8',
  green: '#2d8a4e',
  yellow: '#c47f17',
  red: '#c0392b',
  white: '#ffffff',
} as const

const LOGO_CACHE = new Map<string, string | null>()

function sanitizeFilenamePart(value: string) {
  const normalized = value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48)
  return normalized || 'Report'
}

function formatDate(value: string): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMetricValue(metric: MetricResult) {
  if (metric.displayType === 'currency') return formatCurrency(metric.value)
  if (metric.displayType === 'ratio') return `${metric.value.toFixed(2)}x`
  if (metric.displayType === 'score') return `${metric.value.toFixed(1)} / 100`
  if (metric.displayType === 'count') return `${Math.round(metric.value)}`
  return `${metric.value.toFixed(1)}%`
}

function getScoreLabel(grade: string) {
  if (grade === 'green') return 'Elite'
  if (grade === 'yellow') return 'Average'
  return 'Critical'
}

function getScoreColor(grade: string) {
  if (grade === 'green') return COLORS.green
  if (grade === 'yellow') return COLORS.yellow
  return COLORS.red
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read image blob'))
    reader.readAsDataURL(blob)
  })
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  if (LOGO_CACHE.has(url)) return LOGO_CACHE.get(url) || null

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Image request failed (${response.status})`)
    const blob = await response.blob()
    const dataUrl = await blobToDataUrl(blob)
    LOGO_CACHE.set(url, dataUrl)
    return dataUrl
  } catch (error) {
    console.warn('Unable to load PL PDF logo, falling back to text mark:', error)
    LOGO_CACHE.set(url, null)
    return null
  }
}

export async function generatePLReportPDF(options: PLPdfOptions): Promise<void> {
  const {
    result,
    coachName,
    clientName,
    generatedOn,
    programMode,
    scenarioRows,
    sensitivityRows,
    actionItems,
    input,
    mastermindPeriods = [],
  } = options

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  const bottomLimit = pageHeight - 18
  const reportDate = formatDate(generatedOn)
  const logoDataUrl = await loadImageDataUrl(DISCOVERY_PDF_LOGO_WHITE_URL)
  let y = 0

  const drawHeader = (continuation = false) => {
    const title = programMode === 'mastermind'
      ? 'Mastermind Trajectory Report'
      : 'P&L Financial Health Report'

    doc.setFillColor(COLORS.headerBg)
    doc.rect(0, 0, pageWidth, 34, 'F')
    doc.setTextColor(COLORS.white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(continuation ? 15 : 18)
    doc.text(continuation ? `${title} (continued)` : title, margin, continuation ? 14 : 17)

    if (logoDataUrl) {
      const logoWidth = 44
      const logoHeight = 10
      doc.addImage(
        logoDataUrl,
        'PNG',
        pageWidth - margin - logoWidth,
        12,
        logoWidth,
        logoHeight,
        undefined,
        'FAST',
      )
    } else {
      doc.setFontSize(11)
      doc.text('PT Biz', pageWidth - margin, 17, { align: 'right' })
    }

    y = 42
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(COLORS.textMuted)

    const profileText = [
      `Client: ${clientName || 'Client'}`,
      `Coach: ${coachName || 'N/A'}`,
      `Date: ${reportDate || formatDate(new Date().toISOString())}`,
      `Track: ${programMode === 'mastermind' ? 'Mastermind' : 'Rainmaker'}`,
      `Clinic: ${input.clinicSize === 'multi' ? 'Multi-Clinician' : 'Individual'} / ${input.clinicModel === 'hybrid' ? 'Hybrid' : 'Cash'} / ${input.businessStage}`,
    ].join('  |  ')

    const metaLines = doc.splitTextToSize(profileText, contentWidth)
    doc.text(metaLines, margin, y)
    y += metaLines.length * 4.5 + 2

    doc.setDrawColor(COLORS.line)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6
  }

  const ensureSpace = (heightNeeded: number) => {
    if (y + heightNeeded <= bottomLimit) return
    doc.addPage()
    drawHeader(true)
  }

  const drawSectionTitle = (title: string, color: string) => {
    ensureSpace(10)
    doc.setTextColor(color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(title, margin, y)
    y += 6
  }

  const drawBulletList = (
    items: string[],
    emptyText: string,
    textColor: string = COLORS.textDark,
  ) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(textColor)

    if (items.length === 0) {
      ensureSpace(6)
      doc.text(emptyText, margin + 2, y)
      y += 5
      return
    }

    for (const item of items) {
      const lines = doc.splitTextToSize(`- ${item}`, contentWidth - 2)
      ensureSpace(lines.length * 4.5 + 2)
      doc.text(lines, margin + 2, y)
      y += lines.length * 4.5 + 1.5
    }
  }

  const drawMetricGroup = (title: string, metrics: MetricResult[]) => {
    if (metrics.length === 0) return
    drawSectionTitle(title, COLORS.accentBlue)

    for (const metric of metrics) {
      const diagnosticLines = doc.splitTextToSize(metric.diagnostic, contentWidth - 6)
      const blockHeight = 12 + diagnosticLines.length * 4.3
      ensureSpace(blockHeight + 2)

      doc.setFillColor(COLORS.surface)
      doc.setDrawColor('#e2e8f0')
      doc.roundedRect(margin, y, contentWidth, blockHeight, 2, 2, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(COLORS.textDark)
      doc.text(metric.name, margin + 3, y + 5)
      doc.text(formatMetricValue(metric), margin + contentWidth - 3, y + 5, { align: 'right' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(COLORS.textMuted)
      doc.text(`Grade: ${getScoreLabel(metric.grade)} | Target: ${metric.target} | Band: ${metric.threshold}`, margin + 3, y + 9)
      doc.text(diagnosticLines, margin + 3, y + 13)

      y += blockHeight + 2
    }
  }

  drawHeader(false)

  const scoreColor = getScoreColor(result.overallGrade)
  ensureSpace(30)

  doc.setFillColor(scoreColor)
  doc.roundedRect(margin, y, 42, 30, 3, 3, 'F')
  doc.setTextColor(COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(String(result.score), margin + 21, y + 14, { align: 'center' })
  doc.setFontSize(9)
  doc.text('/ 100', margin + 21, y + 20, { align: 'center' })
  doc.text(getScoreLabel(result.overallGrade), margin + 21, y + 26, { align: 'center' })

  const summaryX = margin + 47
  const summaryWidth = contentWidth - 47
  doc.setDrawColor('#e2e8f0')
  doc.setFillColor(COLORS.surface)
  doc.roundedRect(summaryX, y, summaryWidth, 30, 2, 2, 'FD')
  doc.setTextColor(COLORS.textDark)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`ODI: ${formatCurrency(result.odi)}`, summaryX + 3, y + 7)
  doc.text(`Enterprise Value: ${formatCurrency(result.enterpriseValueLow)} - ${formatCurrency(result.enterpriseValueHigh)}`, summaryX + 3, y + 13)
  doc.text(`Benchmark: ${result.benchmarkVersion} | Confidence: ${result.confidence}%`, summaryX + 3, y + 19)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(COLORS.textMuted)
  const cashFlowSummaryLines = doc.splitTextToSize(result.cashFlowSummary, summaryWidth - 6)
  doc.text(cashFlowSummaryLines, summaryX + 3, y + 24)
  y += 36

  if (result.warnings.length > 0) {
    drawSectionTitle('Data Quality Warnings', COLORS.red)
    drawBulletList(result.warnings, 'No warnings.', COLORS.red)
    y += 2
  }

  if (scenarioRows.length > 0) {
    drawSectionTitle('Scenario Forecast', COLORS.accentBlue)
    for (const row of scenarioRows) {
      ensureSpace(6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(COLORS.textDark)
      doc.text(`${row.name}: Score ${row.score} | ODI ${formatCurrency(row.odi)} | Grade ${getScoreLabel(row.grade)}`, margin + 2, y)
      y += 5
    }
    y += 2
  }

  if (sensitivityRows.length > 0) {
    drawSectionTitle('Highest-Impact Levers', COLORS.accentBlue)
    for (const entry of sensitivityRows) {
      ensureSpace(6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(COLORS.textDark)
      const deltaPrefix = entry.scoreDelta >= 0 ? '+' : ''
      doc.text(`${entry.label}: ${deltaPrefix}${entry.scoreDelta} score`, margin + 2, y)
      y += 5
    }
    y += 2
  }

  drawMetricGroup('Core Financial Health', result.coreMetrics)
  drawMetricGroup('Growth KPIs', result.growthMetrics)
  drawMetricGroup('Operational Efficiency', result.operationalMetrics)

  if (programMode === 'mastermind' && mastermindPeriods.length > 0) {
    drawSectionTitle('Mastermind Timeline', COLORS.accentBlue)
    const sorted = [...mastermindPeriods].sort((a, b) => a.order - b.order)
    for (const period of sorted) {
      ensureSpace(6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(COLORS.textDark)
      doc.text(
        `${period.label}: Revenue ${formatCurrency(period.input.totalGrossRevenue)} | Visits ${Math.round(period.input.totalPatientVisits)} | Source ${period.source}`,
        margin + 2,
        y,
      )
      y += 5
    }
    y += 2
  }

  const groupedActionItems = {
    phase1: actionItems.filter((item) => item.phase === 1),
    phase2: actionItems.filter((item) => item.phase === 2),
    phase3: actionItems.filter((item) => item.phase === 3),
  }

  drawSectionTitle('90-Day Action Plan', COLORS.accentBlue)
  const phaseRows: Array<{ label: string; items: ActionItem[] }> = [
    { label: 'Days 1-30', items: groupedActionItems.phase1 },
    { label: 'Days 31-60', items: groupedActionItems.phase2 },
    { label: 'Days 61-90', items: groupedActionItems.phase3 },
  ]

  for (const phase of phaseRows) {
    ensureSpace(8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(COLORS.textDark)
    doc.text(phase.label, margin + 2, y)
    y += 5

    if (phase.items.length === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(COLORS.textMuted)
      doc.text('- No items defined.', margin + 4, y)
      y += 4
      continue
    }

    for (const item of phase.items) {
      const status = item.completed ? '[x]' : '[ ]'
      const lines = doc.splitTextToSize(`${status} ${item.text}`, contentWidth - 8)
      ensureSpace(lines.length * 4.2 + 2)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(COLORS.textDark)
      doc.text(lines, margin + 4, y)
      y += lines.length * 4.2 + 1

      if (item.expectedImpact) {
        ensureSpace(4.5)
        doc.setFontSize(8.5)
        doc.setTextColor(COLORS.textMuted)
        doc.text(`Impact: ${item.expectedImpact}`, margin + 8, y)
        y += 3.8
      }
    }
    y += 1
  }

  const footerText = 'Generated by PT Biz P&L Grader. Structured text export (jsPDF).'
  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(COLORS.line)
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor('#9ca3af')
    doc.text(footerText, margin, pageHeight - 7)
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' })
  }

  const filenameDate = generatedOn
    ? generatedOn.replace(/[^0-9-]/g, '')
    : new Date().toISOString().slice(0, 10)
  const filenameClient = sanitizeFilenamePart(clientName || 'Client')
  doc.save(`PT_Biz_PL_Report_${filenameClient}_${filenameDate}.pdf`)
}
