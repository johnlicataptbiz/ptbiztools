import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

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

router.post('/upload', async (req, res) => {
  try {
    if (!req.body || !req.body.name) {
      return res.status(400).json({ error: 'Missing name or data' });
    }
    
    const { name, data: base64Data, mimeType = 'video/mp4' } = req.body;
    const data = Buffer.from(base64Data, 'base64');
    
    await prisma.video.upsert({
      where: { name },
      update: { data, mimeType, size: data.length },
      create: { id: name, name, data, mimeType, size: data.length }
    });
    
    res.json({ success: true, message: `Video ${name} uploaded` });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

export default router;
