import { createHash } from 'crypto'
import { gunzipSync, gzipSync } from 'zlib'

export function normalizeLabel(input: string): string {
  return input
    .toLowerCase()
    .replace(/[$,%()]/g, ' ')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseNumericValue(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return input
  if (typeof input !== 'string') return null

  const raw = input.trim()
  if (!raw) return null

  const cleaned = raw
    .replace(/[$,\s]/g, '')
    .replace(/\(([^)]+)\)/g, '-$1')

  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value)) return null
  return value
}

export function inferUnitHint(label: string): 'currency' | 'count' | 'percent' | 'unknown' {
  const n = normalizeLabel(label)
  if (n.includes('%') || n.includes('percent') || n.includes('ratio') || n.includes('margin')) return 'percent'
  if (n.includes('visit') || n.includes('member') || n.includes('lead') || n.includes('count')) return 'count'
  if (n.includes('revenue') || n.includes('cost') || n.includes('expense') || n.includes('salary') || n.includes('payroll')) return 'currency'
  return 'unknown'
}

export function compressData(data: Buffer): { data: Buffer; isCompressed: boolean; compression: 'gzip' | 'none' } {
  try {
    const compressed = gzipSync(data)
    if (compressed.length < data.length) {
      return { data: compressed, isCompressed: true, compression: 'gzip' }
    }
  } catch {
    // Fall through to uncompressed payload.
  }

  return { data, isCompressed: false, compression: 'none' }
}

export function decompressData(data: Buffer, compression: string): Buffer {
  if (compression === 'gzip') return gunzipSync(data)
  return data
}

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

export function isLikelyPdf(data: Buffer): boolean {
  if (data.length < 4) return false
  return data.subarray(0, 4).toString('utf8') === '%PDF'
}

export function isLikelyZip(data: Buffer): boolean {
  if (data.length < 2) return false
  return data[0] === 0x50 && data[1] === 0x4b
}

export function isLikelyXls(data: Buffer): boolean {
  if (data.length < 8) return false
  const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
  return signature.every((byte, index) => data[index] === byte)
}

export function isLikelyPng(data: Buffer): boolean {
  if (data.length < 8) return false
  const sig = [0x89, 0x50, 0x4e, 0x47]
  return sig.every((byte, index) => data[index] === byte)
}

export function isLikelyJpeg(data: Buffer): boolean {
  if (data.length < 3) return false
  return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
}

export function summarizeText(input: string, maxLength = 4000): string {
  if (input.length <= maxLength) return input
  return `${input.slice(0, maxLength)}\n...`
}
