import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
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

function inferSourceType(file: Express.Multer.File): 'pdf' | 'text' {
  const lowerName = file.originalname.toLowerCase();
  const lowerMime = (file.mimetype || '').toLowerCase();
  if (lowerName.endsWith('.pdf') || lowerMime.includes('pdf')) return 'pdf';
  return 'text';
}

function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

transcriptRouter.use(attachSessionUser);

transcriptRouter.post('/extract', requireAuth, upload.single('file'), async (req: SessionRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    const sourceType = inferSourceType(req.file);
    let text = '';

    if (sourceType === 'pdf') {
      const pdfParseModule = await import('pdf-parse');
      const pdfParse =
        (pdfParseModule as unknown as {
          default?: (data: Buffer, options?: { max?: number }) => Promise<{ text: string }>;
        }).default
        || (pdfParseModule as unknown as (data: Buffer, options?: { max?: number }) => Promise<{ text: string }>);

      const parsed = await pdfParse(req.file.buffer, { max: 30 });
      text = String(parsed?.text || '');
    } else {
      text = req.file.buffer.toString('utf-8');
    }

    const normalized = text.replace(/\r\n/g, '\n').trim();
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
