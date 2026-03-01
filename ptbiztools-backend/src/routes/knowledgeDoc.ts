import { NextFunction, Request, Response, Router } from 'express';
import { seedKnowledgeFromManifest } from '../knowledge/seedManifest.js';
import { prisma } from '../services/prisma.js';

export const knowledgeDocRouter = Router();

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
    console.error('Knowledge admin check failed:', error);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

knowledgeDocRouter.get('/', async (req, res) => {
  try {
    const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';

    const docs = await prisma.knowledgeDoc.findMany({
      where: slug ? { slug } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ docs, total: docs.length });
  } catch (error) {
    console.error('Error fetching knowledge docs:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge docs' });
  }
});

knowledgeDocRouter.post('/seed', requireAdmin, async (req, res) => {
  try {
    const result = await seedKnowledgeFromManifest(prisma);
    res.json({
      success: true,
      message: 'Knowledge docs seeded',
      ...result,
    });
  } catch (error) {
    console.error('Error seeding knowledge docs:', error);
    res.status(500).json({ error: 'Failed to seed knowledge docs' });
  }
});

knowledgeDocRouter.get('/:id', async (req, res) => {
  try {
    const doc = await prisma.knowledgeDoc.findUnique({
      where: { id: req.params.id },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Doc not found' });
    }

    res.json(doc);
  } catch (error) {
    console.error('Error fetching knowledge doc:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge doc' });
  }
});
