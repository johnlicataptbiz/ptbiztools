import { PARSER_VERSION, PDF_MAX_PAGES } from '../constants.js'
import type { ParseOutput, ParsedCandidate } from '../types.js'
import { inferUnitHint, normalizeLabel, parseNumericValue, summarizeText } from '../utils.js'
import { runOCR } from './ocrParser.js'

function parseCandidatesFromText(text: string, sourceType: 'pdf' | 'image'): ParsedCandidate[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const candidates: ParsedCandidate[] = []

  lines.forEach((line, index) => {
    const parts = line
      .split(/\s{2,}|\t|\|/)
      .map((part) => part.trim())
      .filter(Boolean)

    if (parts.length < 2) return

    const possibleValue = parts[parts.length - 1]
    const value = parseNumericValue(possibleValue)
    if (value === null) return

    const label = parts.slice(0, parts.length - 1).join(' ').trim()
    if (label.length < 3) return

    const normalized = normalizeLabel(label)
    candidates.push({
      id: `${sourceType}:line:${index}`,
      label,
      normalizedLabel: normalized,
      value,
      sourceType,
      rowIndex: index,
      columnIndex: parts.length - 1,
      unitHint: inferUnitHint(label),
    })
  })

  const dedupeMap = new Map<string, ParsedCandidate>()
  for (const candidate of candidates) {
    const key = `${candidate.normalizedLabel}:${candidate.value}`
    if (!dedupeMap.has(key)) dedupeMap.set(key, candidate)
  }

  return Array.from(dedupeMap.values())
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParseOutput> {
  let text = ''
  let pageCount = 0
  const warnings: string[] = []

  try {
    const pdfParseModule = await import('pdf-parse')
    const pdfParse =
      (pdfParseModule as unknown as { default?: (data: Buffer, options?: { max?: number }) => Promise<{ text: string; numpages?: number }> }).default
      || (pdfParseModule as unknown as (data: Buffer, options?: { max?: number }) => Promise<{ text: string; numpages?: number }>)
    const parsed = await pdfParse(buffer, { max: PDF_MAX_PAGES })
    text = parsed.text || ''
    pageCount = parsed.numpages || 0
    if (pageCount > PDF_MAX_PAGES) {
      warnings.push(`PDF page count (${pageCount}) exceeds cap (${PDF_MAX_PAGES}). Parsed first ${PDF_MAX_PAGES} pages.`)
    }
  } catch (error) {
    warnings.push(`PDF text extraction failed: ${(error as Error).message}`)
  }

  let usedOCR = false
  const extractedChars = text.length

  if (extractedChars < 250) {
    const ocr = await runOCR(buffer)
    if (ocr.text.length > 0) {
      text = ocr.text
      usedOCR = true
    }
    warnings.push(...ocr.warnings)
    if (usedOCR) warnings.push('OCR fallback used due to low text extraction quality.')
  }

  const candidates = parseCandidatesFromText(text, 'pdf')
  const numericTokenCount = (text.match(/-?\$?\d[\d,]*(\.\d+)?/g) || []).length
  const labelCoverageScore = Math.min(100, Math.round((candidates.length / Math.max(numericTokenCount, 1)) * 100))

  return {
    sourceType: 'pdf',
    parserVersion: PARSER_VERSION,
    candidates,
    tablePreview: text
      .split(/\r?\n/)
      .slice(0, 30)
      .map((line) => [line]),
    textPreview: summarizeText(text, 6000),
    qualitySignals: {
      parser: 'pdf-parse',
      parserVersion: PARSER_VERSION,
      pageCount,
      extractedChars: text.length,
      numericTokenCount,
      labelCoverageScore,
      usedOCR,
      warnings,
    },
  }
}

export async function parseImageBuffer(buffer: Buffer): Promise<ParseOutput> {
  const ocr = await runOCR(buffer)
  const text = ocr.text
  const candidates = parseCandidatesFromText(text, 'image')
  const numericTokenCount = (text.match(/-?\$?\d[\d,]*(\.\d+)?/g) || []).length

  return {
    sourceType: 'image',
    parserVersion: PARSER_VERSION,
    candidates,
    tablePreview: text
      .split(/\r?\n/)
      .slice(0, 30)
      .map((line) => [line]),
    textPreview: summarizeText(text, 6000),
    qualitySignals: {
      parser: 'tesseract.js',
      parserVersion: PARSER_VERSION,
      extractedChars: text.length,
      numericTokenCount,
      labelCoverageScore: Math.min(100, Math.round((candidates.length / Math.max(numericTokenCount, 1)) * 100)),
      usedOCR: true,
      warnings: ocr.warnings,
    },
  }
}
