import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import type { Readable } from 'node:stream';
import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../services/prisma.js';
import {
  getVideoObject,
  headVideoObject,
  isObjectStorageEnabled,
  uploadVideoObject,
} from '../services/objectStorage.js';

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, '/tmp'),
    filename: (_req, file, callback) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${safeName}`);
    },
  }),
  limits: {
    fileSize: Number(process.env.MEDIA_UPLOAD_MAX_BYTES || 1024 * 1024 * 1024), // 1 GB
  },
});

async function cleanupTempFile(filePath?: string) {
  if (!filePath) return;

  try {
    await fsPromises.unlink(filePath);
  } catch {
    // Ignore cleanup failures.
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.cookies?.ptbiz_user as string | undefined;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    console.error('Video admin check failed:', error);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

router.get('/:name', async (req, res) => {
  const { name } = req.params;
  
  try {
    if (isObjectStorageEnabled()) {
      const objectHead = await headVideoObject(name);
      if (objectHead.exists) {
        const object = await getVideoObject(name);
        if (!object.body) {
          res.status(500).json({ error: 'Video body unavailable' });
          return;
        }

        res.setHeader('Content-Type', object.contentType || 'video/mp4');
        if (object.contentLength) {
          res.setHeader('Content-Length', object.contentLength.toString());
        }
        if (object.etag) {
          res.setHeader('ETag', object.etag);
        }

        const streamBody = object.body as Readable;
        streamBody.on('error', (streamError) => {
          console.error('Error streaming video from object storage:', streamError);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream video' });
          } else {
            res.end();
          }
        });
        streamBody.pipe(res);
        return;
      }
    }

    const video = await prisma.video.findUnique({
      where: { name }
    });
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.setHeader('Content-Type', video.mimeType);
    res.setHeader('Content-Length', video.size);
    res.send(Buffer.from(video.data));
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

router.post('/upload', requireAdmin, upload.single('file'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const mimeTypeFromBody = typeof req.body?.mimeType === 'string' ? req.body.mimeType : undefined;

    if (!name) {
      return res.status(400).json({ error: 'Missing asset name' });
    }

    if (isObjectStorageEnabled()) {
      if (req.file?.path) {
        const contentType = mimeTypeFromBody || req.file.mimetype || 'video/mp4';
        const stream = fs.createReadStream(req.file.path);

        const uploaded = await uploadVideoObject({
          assetName: name,
          body: stream,
          contentType,
          contentLength: req.file.size,
        });

        res.json({
          success: true,
          message: `Media ${name} uploaded`,
          storage: 'object',
          key: uploaded.key,
          size: req.file.size,
          mimeType: contentType,
        });
        return;
      }

      const base64Data = typeof req.body?.data === 'string' ? req.body.data : '';
      if (!base64Data) {
        return res.status(400).json({ error: 'Missing upload file or base64 data' });
      }

      const data = Buffer.from(base64Data, 'base64');
      const contentType = mimeTypeFromBody || 'video/mp4';

      const uploaded = await uploadVideoObject({
        assetName: name,
        body: data,
        contentType,
        contentLength: data.length,
      });

      res.json({
        success: true,
        message: `Media ${name} uploaded`,
        storage: 'object',
        key: uploaded.key,
        size: data.length,
        mimeType: contentType,
      });
      return;
    }

    let data: Buffer;
    let mimeType = mimeTypeFromBody || 'video/mp4';

    if (req.file?.path) {
      data = await fsPromises.readFile(req.file.path);
      mimeType = mimeTypeFromBody || req.file.mimetype || mimeType;
    } else if (typeof req.body?.data === 'string' && req.body.data.length > 0) {
      data = Buffer.from(req.body.data, 'base64');
    } else {
      return res.status(400).json({ error: 'Missing upload file or base64 data' });
    }

    await prisma.video.upsert({
      where: { name },
      update: { data, mimeType, size: data.length },
      create: { id: name, name, data, mimeType, size: data.length }
    });
    
    res.json({ success: true, message: `Media ${name} uploaded` });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  } finally {
    await cleanupTempFile(filePath);
  }
});

export default router;
