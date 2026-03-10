import type { ImportSourceType, ParsedCandidate } from '../types.js'
import { inferUnitHint, normalizeLabel, parseNumericValue } from '../utils.js'

export function buildCandidatesFromRows(
  rows: string[][],
  sourceType: ImportSourceType,
  sheetName?: string,
): ParsedCandidate[] {
  const candidates: ParsedCandidate[] = []

  rows.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) return

    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const current = row[colIndex] || ''
      const currentText = String(current).trim()
      if (!currentText) continue

      const value = parseNumericValue(currentText)
      if (value === null) continue

      const labelFromLeft = findNearestLabel(row, colIndex)
      const labelFromFirst = String(row[0] || '').trim()
      const label = labelFromLeft || labelFromFirst
      if (!label || normalizeLabel(label).length < 3) continue

      const normalizedLabel = normalizeLabel(label)

      candidates.push({
        id: `${sourceType}:${sheetName || 'sheet'}:${rowIndex}:${colIndex}`,
        label,
        normalizedLabel,
        value,
        sourceType,
        sheetName,
        rowIndex,
        columnIndex: colIndex,
        unitHint: inferUnitHint(label),
      })
    }
  })

  return dedupeCandidates(candidates)
}

function findNearestLabel(row: string[], numericColumn: number): string {
  for (let i = numericColumn - 1; i >= 0; i -= 1) {
    const candidate = String(row[i] || '').trim()
    if (!candidate) continue
    if (parseNumericValue(candidate) !== null) continue
    return candidate
  }
  return ''
}

export function dedupeCandidates(candidates: ParsedCandidate[]): ParsedCandidate[] {
  const map = new Map<string, ParsedCandidate>()

  for (const candidate of candidates) {
    const key = `${candidate.normalizedLabel}:${candidate.value}`
    if (!map.has(key)) {
      map.set(key, candidate)
    }
  }

  return Array.from(map.values())
}
