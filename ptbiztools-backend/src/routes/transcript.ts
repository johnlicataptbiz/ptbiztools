import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { prisma } from '../services/prisma.js';

const transcriptRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

interface SessionRequest extends Request {
  currentUserId?: string;
}

async function attachSessionUser(req: SessionRequest, _res: Response, next: NextFunction) {
  try {
    const userId = req.cookies?.ptbiz_user as string | undefined;
    if (!userId) return next();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (user) {
      req.currentUserId = user.id;
    }

    next();
  } catch (error) {
    next(error);
  }
}

function requireAuth(req: SessionRequest, res: Response, next: NextFunction) {
  if (!req.currentUserId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  next();
}

type TranscriptSourceType = 'pdf' | 'text' | 'csv' | 'rtf' | 'xlsx' | 'image';

const SUPPORTED_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.rtf',
  '.pdf',
  '.xlsx',
  '.xls',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
]);

function inferSourceType(file: Express.Multer.File): TranscriptSourceType {
  const lowerName = file.originalname.toLowerCase();
  const lowerMime = (file.mimetype || '').toLowerCase();
  if (lowerName.endsWith('.pdf') || lowerMime.includes('pdf')) return 'pdf';
  if (lowerName.endsWith('.rtf') || lowerMime.includes('rtf')) return 'rtf';
  if (lowerName.endsWith('.csv') || lowerMime.includes('csv')) return 'csv';
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerMime.includes('sheet') || lowerMime.includes('excel')) {
    return 'xlsx';
  }
  if (
    lowerName.endsWith('.png')
    || lowerName.endsWith('.jpg')
    || lowerName.endsWith('.jpeg')
    || lowerName.endsWith('.webp')
    || lowerMime.startsWith('image/')
  ) {
    return 'image';
  }
  return 'text';
}

function isSupportedFile(file: Express.Multer.File): boolean {
  const lowerName = file.originalname.toLowerCase();
  const extension = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : '';
  const lowerMime = (file.mimetype || '').toLowerCase();
  if (SUPPORTED_EXTENSIONS.has(extension)) return true;
  return (
    lowerMime.includes('text')
    || lowerMime.includes('json')
    || lowerMime.includes('csv')
    || lowerMime.includes('pdf')
    || lowerMime.includes('rtf')
    || lowerMime.startsWith('image/')
    || lowerMime.includes('sheet')
    || lowerMime.includes('excel')
  );
}

function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function normalizeText(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim();
}

function parseRtfToText(raw: string) {
  return raw
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-z]+\d* ?/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

function parseXlsxToText(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const snippets: string[] = [];

  for (const sheetName of workbook.SheetNames.slice(0, 8)) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, raw: false }) as Array<Array<unknown>>;
    const lines = rows
      .slice(0, 600)
      .map((row) => row.map((cell) => String(cell ?? '').trim()).filter(Boolean).join(' | '))
      .filter(Boolean);
    if (lines.length > 0) {
      snippets.push(`[Sheet: ${sheetName}]`);
      snippets.push(lines.join('\n'));
    }
  }

  return snippets.join('\n\n');
}

async function runImageOCR(buffer: Buffer) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const result = await worker.recognize(buffer);
    return String(result?.data?.text || '');
  } finally {
    await worker.terminate();
  }
}

transcriptRouter.use(attachSessionUser);

transcriptRouter.post('/extract', requireAuth, upload.single('file'), async (req: SessionRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    if (!isSupportedFile(req.file)) {
      res.status(400).json({
        error: 'Unsupported file type. Use PDF, TXT, MD, CSV, JSON, RTF, XLSX, XLS, PNG, JPG, JPEG, or WEBP.',
      });
      return;
    }

    const sourceType = inferSourceType(req.file);
    let text = '';

    switch (sourceType) {
      case 'pdf': {
        const pdfParseModule = await import('pdf-parse');
        const pdfParse =
          (pdfParseModule as unknown as {
            default?: (data: Buffer, options?: { max?: number }) => Promise<{ text: string }>;
          }).default
          || (pdfParseModule as unknown as (data: Buffer, options?: { max?: number }) => Promise<{ text: string }>);

        const parsed = await pdfParse(req.file.buffer, { max: 40 });
        text = String(parsed?.text || '');
        if (countWords(text) < 20) {
          const ocrText = await runImageOCR(req.file.buffer);
          if (countWords(ocrText) > countWords(text)) {
            text = ocrText;
          }
        }
        break;
      }
      case 'image': {
        text = await runImageOCR(req.file.buffer);
        break;
      }
      case 'xlsx': {
        text = parseXlsxToText(req.file.buffer);
        break;
      }
      case 'rtf': {
        const raw = req.file.buffer.toString('utf-8');
        text = parseRtfToText(raw);
        break;
      }
      case 'csv':
      case 'text':
      default: {
        text = req.file.buffer.toString('utf-8');
      }
    }

    const normalized = normalizeText(text);
    if (!normalized) {
      res.status(400).json({ error: 'No readable transcript text found in file' });
      return;
    }

    res.json({
      text: normalized,
      sourceType,
      filename: req.file.originalname,
      wordCount: countWords(normalized),
      charCount: normalized.length,
    });
  } catch (error) {
    console.error('Failed to extract transcript text:', error);
    res.status(500).json({ error: 'Failed to extract transcript text' });
  }
});

export default transcriptRouter;
