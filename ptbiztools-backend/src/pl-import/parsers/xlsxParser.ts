import XLSX from 'xlsx'
import { PARSER_VERSION, XLSX_MAX_ROWS, XLSX_MAX_SHEETS } from '../constants.js'
import type { ParseOutput } from '../types.js'
import { normalizeLabel, summarizeText } from '../utils.js'
import { buildCandidatesFromRows } from './shared.js'

const SIGNAL_TERMS = [
  'revenue',
  'expense',
  'payroll',
  'profit',
  'loss',
  'income',
  'rent',
  'operating',
  'cogs',
]

function scoreSheet(rows: string[][]): number {
  let score = 0

  for (const row of rows.slice(0, 80)) {
    for (const cell of row) {
      const normalized = normalizeLabel(cell)
      if (!normalized) continue
      if (SIGNAL_TERMS.some((term) => normalized.includes(term))) score += 1
    }
  }

  return score
}

export function parseXlsxBuffer(buffer: Buffer): ParseOutput {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const selectedSheetNames = workbook.SheetNames.slice(0, XLSX_MAX_SHEETS)

  const sheetResults = selectedSheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils
      .sheet_to_json(sheet, { header: 1, blankrows: false, raw: false })
      .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell || '').trim()) : [])) as string[][]

    return {
      sheetName,
      rows: rows.slice(0, XLSX_MAX_ROWS),
      score: scoreSheet(rows),
      truncated: rows.length > XLSX_MAX_ROWS,
    }
  })

  const best = [...sheetResults].sort((a, b) => b.score - a.score)[0]
  const tablePreview = (best?.rows || []).slice(0, 30)

  const candidates = sheetResults.flatMap((sheet) => buildCandidatesFromRows(sheet.rows, 'xlsx', sheet.sheetName))

  const warnings: string[] = []
  if (workbook.SheetNames.length > XLSX_MAX_SHEETS) {
    warnings.push(`Workbook contains ${workbook.SheetNames.length} sheets. Parsed first ${XLSX_MAX_SHEETS}.`)
  }
  for (const sheet of sheetResults) {
    if (sheet.truncated) warnings.push(`Sheet ${sheet.sheetName} truncated to ${XLSX_MAX_ROWS} rows.`)
  }

  const textPreview = summarizeText(
    tablePreview.map((row) => row.join(' | ')).join('\n'),
    4000,
  )

  const totalRows = sheetResults.reduce((sum, sheet) => sum + sheet.rows.length, 0)

  return {
    sourceType: 'xlsx',
    parserVersion: PARSER_VERSION,
    candidates,
    tablePreview,
    textPreview,
    qualitySignals: {
      parser: 'xlsx',
      parserVersion: PARSER_VERSION,
      rowCount: totalRows,
      columnCount: tablePreview.reduce((max, row) => Math.max(max, row.length), 0),
      labelCoverageScore: Math.min(100, Math.round((candidates.length / Math.max(totalRows, 1)) * 100)),
      usedOCR: false,
      warnings,
    },
  }
}
