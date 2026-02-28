import express, { NextFunction, Request, Response } from 'express';
import { prisma } from '../services/prisma.js';

const router = express.Router();

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

router.post('/upload', requireAdmin, async (req, res) => {
  try {
    if (!req.body || !req.body.name || !req.body.data) {
      return res.status(400).json({ error: 'Missing name or data' });
    }
    
    const { name, data: base64Data, mimeType = 'video/mp4' } = req.body;
    const data = Buffer.from(base64Data, 'base64');
    
    await prisma.video.upsert({
      where: { name },
      update: { data, mimeType, size: data.length },
      create: { id: name, name, data, mimeType, size: data.length }
    });
    
    res.json({ success: true, message: `Media ${name} uploaded` });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

export default router;
