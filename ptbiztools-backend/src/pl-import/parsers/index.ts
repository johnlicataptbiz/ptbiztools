import type { ImportSourceType, ParseOutput } from '../types.js'
import { parseCsvBuffer } from './csvParser.js'
import { parsePdfBuffer, parseImageBuffer } from './pdfParser.js'
import { parseXlsxBuffer } from './xlsxParser.js'

export async function parseImportBuffer(sourceType: ImportSourceType, buffer: Buffer): Promise<ParseOutput> {
  if (sourceType === 'csv') {
    return parseCsvBuffer(buffer)
  }

  if (sourceType === 'xlsx') {
    return parseXlsxBuffer(buffer)
  }

  if (sourceType === 'pdf') {
    return parsePdfBuffer(buffer)
  }

  return parseImageBuffer(buffer)
}
