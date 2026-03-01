import { Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import multer from 'multer'
import { REQUIRED_FIELDS } from '../pl-import/constants.js'
import { prisma } from '../services/prisma.js'
import type { MappingPatch } from '../pl-import/types.js'
import {
  applyPatchToSession,
  compressUpload,
  fetchParseAndMapping,
  getImportFeatureEnabled,
  inferSourceType,
  parseAndMapFromFile,
  serializeMappedInput,
  validateUpload,
} from '../pl-import/service.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
})

interface SessionRequest extends Request {
  currentUserId?: string
  currentUserRole?: string
}

export const plImportRouter = Router()

function getParamString(value: string | string[] | undefined): string | null {
  const raw = value
  if (typeof raw === 'string' && raw.trim()) return raw
  if (Array.isArray(raw) && raw[0]) return raw[0]
  return null
}

function getImportId(req: SessionRequest): string | null {
  return getParamString(req.params.id as string | string[] | undefined)
}

function getBatchId(req: SessionRequest): string | null {
  return getParamString(req.params.batchId as string | string[] | undefined)
}

function getBatchItemId(req: SessionRequest): string | null {
  return getParamString(req.params.itemId as string | string[] | undefined)
}

async function attachSessionUser(req: SessionRequest, _res: Response, next: NextFunction) {
  try {
    const userId = req.cookies?.ptbiz_user as string | undefined
    if (!userId) return next()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })

    if (user) {
      req.currentUserId = user.id
      req.currentUserRole = user.role
    }

    next()
  } catch (error) {
    next(error)
  }
}

function requireAuth(req: SessionRequest, res: Response, next: NextFunction) {
  if (!req.currentUserId) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  next()
}

async function assertOwnerAccess(req: SessionRequest, res: Response, next: NextFunction) {
  if (!req.currentUserId) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const importId = getImportId(req)
  if (!importId) {
    res.status(400).json({ error: 'Invalid import id' })
    return
  }

  const session = await prisma.pLImportSession.findUnique({
    where: { id: importId },
    select: { id: true, userId: true },
  })

  if (!session) {
    res.status(404).json({ error: 'Import session not found' })
    return
  }

  if (session.userId !== req.currentUserId) {
    res.status(403).json({ error: 'Access denied' })
    return
  }

  next()
}

async function assertBatchOwnerAccess(req: SessionRequest, res: Response, next: NextFunction) {
  if (!req.currentUserId) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const batchId = getBatchId(req)
  if (!batchId) {
    res.status(400).json({ error: 'Invalid batch id' })
    return
  }

  const batch = await prisma.pLImportBatch.findUnique({
    where: { id: batchId },
    select: { id: true, userId: true },
  })

  if (!batch) {
    res.status(404).json({ error: 'Import batch not found' })
    return
  }

  if (batch.userId !== req.currentUserId) {
    res.status(403).json({ error: 'Access denied' })
    return
  }

  next()
}

async function logImportAction(req: SessionRequest, actionType: string, description: string, metadata?: Record<string, unknown>) {
  try {
    await prisma.actionLog.create({
      data: {
        userId: req.currentUserId || null,
        actionType,
        description,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
    })
  } catch (error) {
    console.error('Failed to create import action log:', error)
  }
}

plImportRouter.use((req, res, next) => {
  if (!getImportFeatureEnabled()) {
    res.status(404).json({ error: 'P&L imports feature disabled' })
    return
  }
  next()
})

plImportRouter.use(attachSessionUser)

plImportRouter.post('/', requireAuth, upload.single('file'), async (req: SessionRequest, res: Response) => {
  let importId: string | null = null

  try {
    if (!req.file) {
      res.status(400).json({ error: 'File is required' })
      return
    }

    const validation = validateUpload(req.file)
    if (!validation.ok) {
      res.status(400).json({ error: validation.error })
      return
    }

    const sourceType = inferSourceType(req.file.originalname, req.file.mimetype)
    const compressed = compressUpload(req.file.buffer)

    const session = await prisma.pLImportSession.create({
      data: {
        userId: req.currentUserId,
        status: 'parsing',
        sourceType,
        sourceLabel: typeof req.body.sourceLabel === 'string' ? req.body.sourceLabel.trim() : null,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        parserVersion: null,
        mappingVersion: null,
        overallConfidence: 0,
        requiredFieldsComplete: false,
      },
    })
    importId = session.id

    await prisma.pLImportSourceFile.create({
      data: {
        importSessionId: session.id,
        data: compressed.data,
        sha256: compressed.hash,
        isCompressed: compressed.isCompressed,
        compression: compressed.compression,
      },
    })

    const { parseOutput, mapping } = await parseAndMapFromFile(req.file)

    await prisma.$transaction([
      prisma.pLImportParseArtifact.create({
        data: {
          importSessionId: session.id,
          rawExtraction: parseOutput as unknown as Prisma.InputJsonValue,
          qualitySignals: parseOutput.qualitySignals as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.pLImportMapping.create({
        data: {
          importSessionId: session.id,
          autoMap: mapping.autoMap as unknown as Prisma.InputJsonValue,
          finalMap: mapping.finalMap as unknown as Prisma.InputJsonValue,
          mappedInput: mapping.mappedInput as unknown as Prisma.InputJsonValue,
          fieldConfidence: mapping.fieldConfidence as unknown as Prisma.InputJsonValue,
          manualOverrides: mapping.manualOverrides as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.pLImportSession.update({
        where: { id: session.id },
        data: {
          status: 'ready_for_review',
          parserVersion: parseOutput.parserVersion,
          mappingVersion: mapping.mappingVersion,
          overallConfidence: mapping.overallConfidence,
          requiredFieldsComplete: mapping.requiredFieldsComplete,
          errorMessage: null,
        },
      }),
    ])

    await logImportAction(req, 'pl_import_uploaded', `P&L source uploaded (${req.file.originalname})`, {
      importId: session.id,
      sourceType,
      sizeBytes: req.file.size,
    })

    await logImportAction(req, 'pl_import_parsed', 'P&L source parsed and mapped', {
      importId: session.id,
      candidateCount: parseOutput.candidates.length,
      overallConfidence: mapping.overallConfidence,
      warnings: mapping.warnings,
    })

    if (parseOutput.qualitySignals.usedOCR) {
      await logImportAction(req, 'pl_import_ocr_used', 'OCR fallback used during parsing', {
        importId: session.id,
      })
    }

    res.json({
      importId: session.id,
      status: 'ready_for_review',
      overallConfidence: mapping.overallConfidence,
      requiredFieldsComplete: mapping.requiredFieldsComplete,
      warnings: mapping.warnings,
    })
  } catch (error) {
    console.error('Failed to create P&L import:', error)
    if (importId) {
      await prisma.pLImportSession.update({
        where: { id: importId },
        data: {
          status: 'failed',
          errorMessage: (error as Error).message,
        },
      }).catch((updateError) => {
        console.error('Failed to mark import session as failed:', updateError)
      })
    }
    await logImportAction(req, 'pl_import_failed', 'P&L import failed during upload/parse', {
      importId,
      error: (error as Error).message,
    })
    res.status(500).json({ error: 'Failed to create P&L import' })
  }
})

plImportRouter.get('/', requireAuth, async (req: SessionRequest, res: Response) => {
  try {
    const imports = await prisma.pLImportSession.findMany({
      where: { userId: req.currentUserId },
      include: {
        parseArtifact: {
          select: {
            qualitySignals: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json({
      imports: imports.map((item: (typeof imports)[number]) => ({
        id: item.id,
        status: item.status,
        sourceType: item.sourceType,
        sourceLabel: item.sourceLabel,
        filename: item.filename,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        parserVersion: item.parserVersion,
        mappingVersion: item.mappingVersion,
        overallConfidence: item.overallConfidence,
        requiredFieldsComplete: item.requiredFieldsComplete,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        warnings: (item.parseArtifact?.qualitySignals as { warnings?: string[] } | null)?.warnings || [],
      })),
    })
  } catch (error) {
    console.error('Failed to list P&L imports:', error)
    res.status(500).json({ error: 'Failed to list P&L imports' })
  }
})

plImportRouter.post('/batches', requireAuth, async (req: SessionRequest, res: Response) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const programType = typeof req.body?.programType === 'string' ? req.body.programType.trim() : 'mastermind'

    const batch = await prisma.pLImportBatch.create({
      data: {
        userId: req.currentUserId,
        name: name || null,
        programType: programType || 'mastermind',
        status: 'draft',
      },
    })

    await logImportAction(req, 'pl_import_batch_created', 'Created multi-period import batch', {
      batchId: batch.id,
      programType: batch.programType,
      name: batch.name,
    })

    res.json({
      batch: {
        id: batch.id,
        name: batch.name,
        programType: batch.programType,
        status: batch.status,
        overallConfidence: batch.overallConfidence,
        approvedAt: batch.approvedAt,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      },
    })
  } catch (error) {
    console.error('Failed to create import batch:', error)
    res.status(500).json({ error: 'Failed to create import batch' })
  }
})

plImportRouter.get('/batches', requireAuth, async (req: SessionRequest, res: Response) => {
  try {
    const batches = await prisma.pLImportBatch.findMany({
      where: { userId: req.currentUserId },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json({
      batches: batches.map((batch) => ({
        id: batch.id,
        name: batch.name,
        programType: batch.programType,
        status: batch.status,
        overallConfidence: batch.overallConfidence,
        approvedAt: batch.approvedAt,
        itemCount: batch._count.items,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Failed to list import batches:', error)
    res.status(500).json({ error: 'Failed to list import batches' })
  }
})

plImportRouter.get('/batches/:batchId', requireAuth, assertBatchOwnerAccess, async (req: SessionRequest, res: Response) => {
  try {
    const batchId = getBatchId(req)
    if (!batchId) {
      res.status(400).json({ error: 'Invalid batch id' })
      return
    }

    const batch = await prisma.pLImportBatch.findUnique({
      where: { id: batchId },
      include: {
        items: {
          orderBy: { periodOrder: 'asc' },
          include: {
            importSession: {
              include: {
                mapping: true,
                parseArtifact: {
                  select: { qualitySignals: true },
                },
              },
            },
          },
        },
      },
    })

    if (!batch) {
      res.status(404).json({ error: 'Import batch not found' })
      return
    }

    res.json({
      batch: {
        id: batch.id,
        name: batch.name,
        programType: batch.programType,
        status: batch.status,
        overallConfidence: batch.overallConfidence,
        timelinePayload: batch.timelinePayload,
        warningSummary: batch.warningSummary,
        approvedAt: batch.approvedAt,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      },
      items: batch.items.map((item) => ({
        id: item.id,
        periodLabel: item.periodLabel,
        periodOrder: item.periodOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        import: {
          id: item.importSession.id,
          status: item.importSession.status,
          sourceType: item.importSession.sourceType,
          sourceLabel: item.importSession.sourceLabel,
          filename: item.importSession.filename,
          overallConfidence: item.importSession.overallConfidence,
          requiredFieldsComplete: item.importSession.requiredFieldsComplete,
          mappedInput: item.importSession.mapping?.mappedInput || null,
          fieldConfidence: item.importSession.mapping?.fieldConfidence || null,
          warnings: (item.importSession.parseArtifact?.qualitySignals as { warnings?: string[] } | null)?.warnings || [],
        },
      })),
    })
  } catch (error) {
    console.error('Failed to fetch import batch:', error)
    res.status(500).json({ error: 'Failed to fetch import batch' })
  }
})

plImportRouter.post('/batches/:batchId/items', requireAuth, assertBatchOwnerAccess, async (req: SessionRequest, res: Response) => {
  try {
    const batchId = getBatchId(req)
    if (!batchId) {
      res.status(400).json({ error: 'Invalid batch id' })
      return
    }

    const importSessionId = typeof req.body?.importSessionId === 'string' ? req.body.importSessionId.trim() : ''
    const periodLabel = typeof req.body?.periodLabel === 'string' ? req.body.periodLabel.trim() : ''
    const periodOrderRaw = req.body?.periodOrder

    if (!importSessionId) {
      res.status(400).json({ error: 'importSessionId is required' })
      return
    }

    if (!periodLabel) {
      res.status(400).json({ error: 'periodLabel is required' })
      return
    }

    const importSession = await prisma.pLImportSession.findUnique({
      where: { id: importSessionId },
      select: { id: true, userId: true, status: true, requiredFieldsComplete: true },
    })

    if (!importSession) {
      res.status(404).json({ error: 'Import session not found' })
      return
    }

    if (importSession.userId !== req.currentUserId) {
      res.status(403).json({ error: 'Cannot attach import session from another user' })
      return
    }

    const existingItems = await prisma.pLImportBatchItem.findMany({
      where: { batchId },
      orderBy: { periodOrder: 'asc' },
      select: { id: true, importSessionId: true, periodOrder: true },
    })

    const existingForSession = existingItems.find((item) => item.importSessionId === importSessionId)

    let periodOrder: number
    if (typeof periodOrderRaw === 'number' && Number.isFinite(periodOrderRaw) && periodOrderRaw > 0) {
      periodOrder = Math.floor(periodOrderRaw)
    } else {
      const maxOrder = existingItems.length > 0 ? Math.max(...existingItems.map((item) => item.periodOrder)) : 0
      periodOrder = maxOrder + 1
    }

    const orderConflict = existingItems.find((item) => item.periodOrder === periodOrder && item.id !== existingForSession?.id)
    if (orderConflict) {
      res.status(400).json({ error: `periodOrder ${periodOrder} is already used in this batch` })
      return
    }

    const item = existingForSession
      ? await prisma.pLImportBatchItem.update({
        where: { id: existingForSession.id },
        data: { periodLabel, periodOrder },
      })
      : await prisma.pLImportBatchItem.create({
        data: {
          batchId,
          importSessionId,
          periodLabel,
          periodOrder,
        },
      })

    await prisma.pLImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'draft',
        approvedAt: null,
      },
    })

    await logImportAction(req, 'pl_import_batch_item_added', 'Added period-tagged import to batch timeline', {
      batchId,
      importSessionId,
      periodLabel,
      periodOrder,
      importStatus: importSession.status,
      requiredFieldsComplete: importSession.requiredFieldsComplete,
      upserted: Boolean(existingForSession),
    })

    res.json({
      item: {
        id: item.id,
        batchId: item.batchId,
        importSessionId: item.importSessionId,
        periodLabel: item.periodLabel,
        periodOrder: item.periodOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    })
  } catch (error) {
    console.error('Failed to add import batch item:', error)
    res.status(500).json({ error: 'Failed to add item to import batch' })
  }
})

plImportRouter.patch('/batches/:batchId/items/:itemId', requireAuth, assertBatchOwnerAccess, async (req: SessionRequest, res: Response) => {
  try {
    const batchId = getBatchId(req)
    const itemId = getBatchItemId(req)
    if (!batchId || !itemId) {
      res.status(400).json({ error: 'Invalid batch item id' })
      return
    }

    const item = await prisma.pLImportBatchItem.findUnique({
      where: { id: itemId },
      select: { id: true, batchId: true, periodOrder: true },
    })

    if (!item || item.batchId !== batchId) {
      res.status(404).json({ error: 'Batch item not found' })
      return
    }

    const periodLabel = typeof req.body?.periodLabel === 'string' ? req.body.periodLabel.trim() : undefined
    const periodOrder = typeof req.body?.periodOrder === 'number' && Number.isFinite(req.body.periodOrder) && req.body.periodOrder > 0
      ? Math.floor(req.body.periodOrder)
      : undefined

    if (periodLabel === undefined && periodOrder === undefined) {
      res.status(400).json({ error: 'Nothing to update' })
      return
    }

    if (periodOrder !== undefined) {
      const orderConflict = await prisma.pLImportBatchItem.findFirst({
        where: {
          batchId,
          periodOrder,
          NOT: { id: itemId },
        },
        select: { id: true },
      })

      if (orderConflict) {
        res.status(400).json({ error: `periodOrder ${periodOrder} is already used in this batch` })
        return
      }
    }

    const updated = await prisma.pLImportBatchItem.update({
      where: { id: itemId },
      data: {
        periodLabel: periodLabel || undefined,
        periodOrder,
      },
    })

    await prisma.pLImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'draft',
        approvedAt: null,
      },
    })

    await logImportAction(req, 'pl_import_batch_item_updated', 'Updated period tag in import batch timeline', {
      batchId,
      itemId,
      periodLabel: updated.periodLabel,
      periodOrder: updated.periodOrder,
    })

    res.json({
      item: {
        id: updated.id,
        batchId: updated.batchId,
        importSessionId: updated.importSessionId,
        periodLabel: updated.periodLabel,
        periodOrder: updated.periodOrder,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error) {
    console.error('Failed to update import batch item:', error)
    res.status(500).json({ error: 'Failed to update batch item' })
  }
})

plImportRouter.delete('/batches/:batchId/items/:itemId', requireAuth, assertBatchOwnerAccess, async (req: SessionRequest, res: Response) => {
  try {
    const batchId = getBatchId(req)
    const itemId = getBatchItemId(req)
    if (!batchId || !itemId) {
      res.status(400).json({ error: 'Invalid batch item id' })
      return
    }

    const item = await prisma.pLImportBatchItem.findUnique({
      where: { id: itemId },
      select: { id: true, batchId: true, importSessionId: true, periodLabel: true },
    })

    if (!item || item.batchId !== batchId) {
      res.status(404).json({ error: 'Batch item not found' })
      return
    }

    await prisma.pLImportBatchItem.delete({ where: { id: item.id } })
    await prisma.pLImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'draft',
        approvedAt: null,
      },
    })

    await logImportAction(req, 'pl_import_batch_item_removed', 'Removed period-tagged import from batch timeline', {
      batchId,
      itemId,
      importSessionId: item.importSessionId,
      periodLabel: item.periodLabel,
    })

    res.json({ ok: true })
  } catch (error) {
    console.error('Failed to remove import batch item:', error)
    res.status(500).json({ error: 'Failed to remove batch item' })
  }
})

plImportRouter.post('/batches/:batchId/approve', requireAuth, assertBatchOwnerAccess, async (req: SessionRequest, res: Response) => {
  try {
    const batchId = getBatchId(req)
    if (!batchId) {
      res.status(400).json({ error: 'Invalid batch id' })
      return
    }

    const batch = await prisma.pLImportBatch.findUnique({
      where: { id: batchId },
      include: {
        items: {
          orderBy: { periodOrder: 'asc' },
          include: {
            importSession: {
              include: {
                mapping: true,
                parseArtifact: {
                  select: { qualitySignals: true },
                },
              },
            },
          },
        },
      },
    })

    if (!batch) {
      res.status(404).json({ error: 'Import batch not found' })
      return
    }

    if (batch.items.length < 2) {
      res.status(400).json({ error: 'Batch approval requires at least 2 tagged periods' })
      return
    }

    const pendingImports = batch.items
      .filter((item) => item.importSession.status !== 'approved')
      .map((item) => ({
        itemId: item.id,
        importSessionId: item.importSession.id,
        periodLabel: item.periodLabel,
        status: item.importSession.status,
      }))

    if (pendingImports.length > 0) {
      res.status(400).json({
        error: 'All period imports must be approved before batch approval',
        pendingImports,
      })
      return
    }

    const invalidMappings = batch.items
      .filter((item) => !item.importSession.mapping || !item.importSession.requiredFieldsComplete)
      .map((item) => ({
        itemId: item.id,
        importSessionId: item.importSession.id,
        periodLabel: item.periodLabel,
        requiredFieldsComplete: item.importSession.requiredFieldsComplete,
        hasMapping: Boolean(item.importSession.mapping),
      }))

    if (invalidMappings.length > 0) {
      res.status(400).json({
        error: 'One or more period imports are missing a complete approved mapping',
        invalidMappings,
      })
      return
    }

    const timeline = batch.items.map((item) => {
      const warnings = (item.importSession.parseArtifact?.qualitySignals as { warnings?: string[] } | null)?.warnings || []
      return {
        itemId: item.id,
        importSessionId: item.importSession.id,
        periodLabel: item.periodLabel,
        periodOrder: item.periodOrder,
        sourceType: item.importSession.sourceType,
        sourceLabel: item.importSession.sourceLabel,
        filename: item.importSession.filename,
        overallConfidence: item.importSession.overallConfidence,
        mappedInput: item.importSession.mapping?.mappedInput || {},
        fieldConfidence: item.importSession.mapping?.fieldConfidence || {},
        warnings,
      }
    })

    const warningSummary = timeline
      .filter((period) => Array.isArray(period.warnings) && period.warnings.length > 0)
      .map((period) => ({
        periodLabel: period.periodLabel,
        warnings: period.warnings,
      }))

    const totalConfidence = timeline.reduce((sum, period) => sum + (period.overallConfidence || 0), 0)
    const overallConfidence = timeline.length > 0 ? Math.round(totalConfidence / timeline.length) : 0

    const approved = await prisma.pLImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'approved',
        overallConfidence,
        timelinePayload: timeline as unknown as Prisma.InputJsonValue,
        warningSummary: warningSummary as unknown as Prisma.InputJsonValue,
        approvedAt: new Date(),
      },
    })

    await logImportAction(req, 'pl_import_batch_approved', 'Approved multi-period import batch timeline', {
      batchId,
      periodCount: timeline.length,
      overallConfidence,
      warningPeriodCount: warningSummary.length,
    })

    res.json({
      batch: {
        id: approved.id,
        name: approved.name,
        programType: approved.programType,
        status: approved.status,
        overallConfidence: approved.overallConfidence,
        approvedAt: approved.approvedAt,
      },
      timeline,
      warningSummary,
    })
  } catch (error) {
    console.error('Failed to approve import batch:', error)
    res.status(500).json({ error: 'Failed to approve import batch' })
  }
})

plImportRouter.get('/:id', requireAuth, assertOwnerAccess, async (req: SessionRequest, res: Response) => {
  try {
    const importId = getImportId(req)
    if (!importId) {
      res.status(400).json({ error: 'Invalid import id' })
      return
    }

    const session = await prisma.pLImportSession.findUnique({
      where: { id: importId },
      include: {
        parseArtifact: true,
        mapping: true,
      },
    })

    if (!session) {
      res.status(404).json({ error: 'Import session not found' })
      return
    }

    res.json({
      import: {
        id: session.id,
        status: session.status,
        sourceType: session.sourceType,
        sourceLabel: session.sourceLabel,
        filename: session.filename,
        mimeType: session.mimeType,
        sizeBytes: session.sizeBytes,
        parserVersion: session.parserVersion,
        mappingVersion: session.mappingVersion,
        overallConfidence: session.overallConfidence,
        requiredFieldsComplete: session.requiredFieldsComplete,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      parseArtifact: session.parseArtifact,
      mapping: session.mapping,
      warnings: (session.parseArtifact?.qualitySignals as { warnings?: string[] } | null)?.warnings || [],
    })
  } catch (error) {
    console.error('Failed to fetch P&L import:', error)
    res.status(500).json({ error: 'Failed to fetch P&L import' })
  }
})

plImportRouter.post('/:id/remap', requireAuth, assertOwnerAccess, async (req: SessionRequest, res: Response) => {
  try {
    const importId = getImportId(req)
    if (!importId) {
      res.status(400).json({ error: 'Invalid import id' })
      return
    }

    const patch = req.body as MappingPatch
    const mapping = await applyPatchToSession(prisma, importId, patch)

    if (!mapping) {
      res.status(404).json({ error: 'Import mapping not found' })
      return
    }

    await logImportAction(req, 'pl_import_mapping_updated', 'P&L mapping updated', {
      importId,
      overallConfidence: mapping.overallConfidence,
      requiredFieldsComplete: mapping.requiredFieldsComplete,
      manualOverrideCount: mapping.manualOverrides.length,
    })

    res.json({ mapping })
  } catch (error) {
    console.error('Failed to remap P&L import:', error)
    await logImportAction(req, 'pl_import_failed', 'P&L remap failed', {
      importId: getImportId(req),
      error: (error as Error).message,
    })
    res.status(500).json({ error: 'Failed to update mapping' })
  }
})

plImportRouter.post('/:id/approve', requireAuth, assertOwnerAccess, async (req: SessionRequest, res: Response) => {
  try {
    const importId = getImportId(req)
    if (!importId) {
      res.status(400).json({ error: 'Invalid import id' })
      return
    }

    const loaded = await fetchParseAndMapping(prisma, importId)
    if (!loaded) {
      res.status(404).json({ error: 'Import mapping not found' })
      return
    }

    const requiredLowConfidenceFields = REQUIRED_FIELDS.filter((field) => (loaded.mapping.fieldConfidence[field] ?? 0) < 60)
    const parseWarnings = loaded.mapping.warnings
    const reviewRequired = !loaded.mapping.requiredFieldsComplete || requiredLowConfidenceFields.length > 0 || parseWarnings.length > 0
    const reviewConfirmed = req.body?.reviewConfirmed === true

    if (reviewRequired && !reviewConfirmed) {
      res.status(400).json({
        error: 'Manual review confirmation required before approval',
        reviewRequired: true,
        requiredFieldsComplete: loaded.mapping.requiredFieldsComplete,
        lowConfidenceFields: requiredLowConfidenceFields,
        warnings: parseWarnings,
      })
      return
    }

    if (!loaded.mapping.requiredFieldsComplete) {
      res.status(400).json({
        error: 'Required fields are incomplete',
        requiredFieldsComplete: false,
      })
      return
    }

    await prisma.pLImportSession.update({
      where: { id: importId },
      data: {
        status: 'approved',
        overallConfidence: loaded.mapping.overallConfidence,
        requiredFieldsComplete: loaded.mapping.requiredFieldsComplete,
      },
    })

    await logImportAction(req, 'pl_import_approved', 'P&L import approved and applied', {
      importId,
      overallConfidence: loaded.mapping.overallConfidence,
      lowConfidenceFields: requiredLowConfidenceFields,
      warnings: parseWarnings,
    })

    res.json({
      importId,
      status: 'approved',
      overallConfidence: loaded.mapping.overallConfidence,
      requiredFieldsComplete: loaded.mapping.requiredFieldsComplete,
      mappedInput: serializeMappedInput(loaded.mapping.mappedInput),
      warnings: loaded.mapping.warnings,
      fieldConfidence: loaded.mapping.fieldConfidence,
    })
  } catch (error) {
    console.error('Failed to approve P&L import:', error)
    await logImportAction(req, 'pl_import_failed', 'P&L approve failed', {
      importId: getImportId(req),
      error: (error as Error).message,
    })
    res.status(500).json({ error: 'Failed to approve import' })
  }
})
