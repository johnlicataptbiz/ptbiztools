import { parse } from 'csv-parse/sync'
import { CSV_MAX_ROWS, PARSER_VERSION } from '../constants.js'
import type { ParseOutput } from '../types.js'
import { summarizeText } from '../utils.js'
import { buildCandidatesFromRows } from './shared.js'

export function parseCsvBuffer(buffer: Buffer): ParseOutput {
  const raw = buffer.toString('utf8')

  const records = parse(raw, {
    delimiter: [',', ';', '\t', '|'],
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  }) as string[][]

  const rows = records
    .slice(0, CSV_MAX_ROWS)
    .map((row) => row.map((cell) => String(cell || '').trim()))

  const candidates = buildCandidatesFromRows(rows, 'csv')

  const textPreview = summarizeText(
    rows
      .slice(0, 30)
      .map((row) => row.join(' | '))
      .join('\n'),
    4000,
  )

  const warnings: string[] = []
  if (records.length > CSV_MAX_ROWS) {
    warnings.push(`CSV rows truncated to ${CSV_MAX_ROWS}.`)
  }

  const extractedChars = raw.length
  const numericTokenCount = (raw.match(/-?\$?\d[\d,]*(\.\d+)?/g) || []).length
  const labelCoverageScore = Math.min(100, Math.round((candidates.length / Math.max(rows.length, 1)) * 100))

  return {
    sourceType: 'csv',
    parserVersion: PARSER_VERSION,
    candidates,
    tablePreview: rows.slice(0, 30),
    textPreview,
    qualitySignals: {
      parser: 'csv-parse/sync',
      parserVersion: PARSER_VERSION,
      rowCount: rows.length,
      columnCount: rows.reduce((max, row) => Math.max(max, row.length), 0),
      extractedChars,
      numericTokenCount,
      labelCoverageScore,
      usedOCR: false,
      warnings,
    },
  }
}
