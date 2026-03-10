import { Prisma, type PrismaClient } from '@prisma/client'
import type { MappingOutput, ParseOutput } from './types.js'
import type { CanonicalPLField, ImportSourceType, MappingPatch } from './types.js'
import { FILE_SIZE_LIMIT_BYTES } from './constants.js'
import { buildAutoMapping, applyMappingPatch } from './mapping/mapper.js'
import { parseImportBuffer } from './parsers/index.js'
import {
  compressData,
  decompressData,
  isLikelyJpeg,
  isLikelyPdf,
  isLikelyPng,
  isLikelyXls,
  isLikelyZip,
  sha256,
} from './utils.js'

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls', '.pdf', '.png', '.jpg', '.jpeg'])

export function getImportFeatureEnabled(): boolean {
  const value = String(process.env.PL_IMPORTS_ENABLED || 'false').toLowerCase().trim()
  return value === '1' || value === 'true' || value === 'yes' || value === 'on'
}

export function inferSourceType(filename: string, mimeType: string): ImportSourceType {
  const lowerName = filename.toLowerCase()
  const lowerMime = mimeType.toLowerCase()

  if (lowerName.endsWith('.csv') || lowerMime.includes('csv') || lowerMime.includes('text/plain')) return 'csv'
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerMime.includes('spreadsheet')) return 'xlsx'
  if (lowerName.endsWith('.pdf') || lowerMime.includes('pdf')) return 'pdf'
  return 'image'
}

function hasAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  for (const extension of ALLOWED_EXTENSIONS) {
    if (lower.endsWith(extension)) return true
  }
  return false
}

export function validateUpload(file: Express.Multer.File): { ok: boolean; error?: string } {
  if (!file) return { ok: false, error: 'File is required' }
  if (file.size > FILE_SIZE_LIMIT_BYTES) return { ok: false, error: 'File exceeds 20MB limit' }
  if (!hasAllowedExtension(file.originalname)) {
    return { ok: false, error: 'Unsupported file extension' }
  }

  const sourceType = inferSourceType(file.originalname, file.mimetype)
  const extension = file.originalname.toLowerCase().split('.').pop() || ''
  const buffer = file.buffer

  if (sourceType === 'pdf' && !isLikelyPdf(buffer)) {
    return { ok: false, error: 'Invalid PDF signature' }
  }

  if (sourceType === 'xlsx' && extension === 'xlsx' && !isLikelyZip(buffer)) {
    return { ok: false, error: 'Invalid spreadsheet signature' }
  }

  if (sourceType === 'xlsx' && extension === 'xls' && !isLikelyXls(buffer)) {
    return { ok: false, error: 'Invalid spreadsheet signature' }
  }

  if (sourceType === 'image' && !isLikelyPng(buffer) && !isLikelyJpeg(buffer)) {
    return { ok: false, error: 'Image must be PNG or JPEG' }
  }

  return { ok: true }
}

export async function parseAndMapFromFile(file: Express.Multer.File): Promise<{ parseOutput: ParseOutput; mapping: MappingOutput; sourceType: ImportSourceType }> {
  const sourceType = inferSourceType(file.originalname, file.mimetype)
  const parseOutput = await parseImportBuffer(sourceType, file.buffer)
  const mapping = buildAutoMapping(parseOutput)
  return { parseOutput, mapping, sourceType }
}

export function serializeMappedInput(mappedInput: Partial<Record<CanonicalPLField, number>>): Record<string, number> {
  return Object.entries(mappedInput).reduce<Record<string, number>>((acc, [key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      acc[key] = value
    }
    return acc
  }, {})
}

export function compressUpload(buffer: Buffer): { data: Buffer; isCompressed: boolean; compression: 'gzip' | 'none'; hash: string } {
  const compressed = compressData(buffer)
  return {
    data: compressed.data,
    isCompressed: compressed.isCompressed,
    compression: compressed.compression,
    hash: sha256(buffer),
  }
}

export async function fetchParseAndMapping(prisma: PrismaClient, importSessionId: string): Promise<{ parseOutput: ParseOutput; mapping: MappingOutput } | null> {
  const session = await prisma.pLImportSession.findUnique({
    where: { id: importSessionId },
    include: {
      parseArtifact: true,
      mapping: true,
    },
  })

  if (!session?.parseArtifact || !session.mapping) return null

  const parseOutput = session.parseArtifact.rawExtraction as unknown as ParseOutput
  const mapping = {
    mappingVersion: session.mappingVersion || '1.0.0',
    autoMap: session.mapping.autoMap as unknown as MappingOutput['autoMap'],
    finalMap: session.mapping.finalMap as unknown as MappingOutput['finalMap'],
    mappedInput: session.mapping.mappedInput as unknown as MappingOutput['mappedInput'],
    fieldConfidence: session.mapping.fieldConfidence as unknown as MappingOutput['fieldConfidence'],
    manualOverrides: session.mapping.manualOverrides as unknown as MappingOutput['manualOverrides'],
    overallConfidence: session.overallConfidence,
    warnings: (session.parseArtifact.qualitySignals as { warnings?: string[] }).warnings || [],
    requiredFieldsComplete: session.requiredFieldsComplete,
  } as MappingOutput

  return { parseOutput, mapping }
}

export async function applyPatchToSession(
  prisma: PrismaClient,
  importSessionId: string,
  patch: MappingPatch,
): Promise<MappingOutput | null> {
  const loaded = await fetchParseAndMapping(prisma, importSessionId)
  if (!loaded) return null

  const next = applyMappingPatch(loaded.parseOutput, loaded.mapping, patch)

  await prisma.pLImportMapping.update({
    where: { importSessionId },
    data: {
      finalMap: next.finalMap as unknown as Prisma.InputJsonValue,
      mappedInput: next.mappedInput as unknown as Prisma.InputJsonValue,
      fieldConfidence: next.fieldConfidence as unknown as Prisma.InputJsonValue,
      manualOverrides: next.manualOverrides as unknown as Prisma.InputJsonValue,
    },
  })

  await prisma.pLImportSession.update({
    where: { id: importSessionId },
    data: {
      status: 'ready_for_review',
      overallConfidence: next.overallConfidence,
      requiredFieldsComplete: next.requiredFieldsComplete,
      mappingVersion: next.mappingVersion,
    },
  })

  return next
}

export async function readOriginalSource(prisma: PrismaClient, importSessionId: string): Promise<Buffer | null> {
  const source = await prisma.pLImportSourceFile.findUnique({ where: { importSessionId } })
  if (!source) return null
  return decompressData(Buffer.from(source.data), source.compression)
}
