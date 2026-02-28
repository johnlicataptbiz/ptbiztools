import { Prisma, ActionLog } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../services/prisma.js';

export const actionLogRouter = Router();

interface ActionLogBody {
  actionType: string;
  description: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

actionLogRouter.post('/', async (req, res) => {
  try {
    const { actionType, description, metadata, userId, sessionId } = req.body as ActionLogBody;

    if (!actionType || !description) {
      res.status(400).json({ error: 'actionType and description are required' });
      return;
    }

    const log = await prisma.actionLog.create({
      data: {
        actionType,
        description,
        metadata: metadata as Prisma.InputJsonValue || undefined,
        userId: userId || null,
        sessionId: sessionId || null,
      },
    });

    res.json(log);
  } catch (error) {
    console.error('Error creating action log:', error);
    res.status(500).json({ error: 'Failed to create action log' });
  }
});

actionLogRouter.get('/', async (req, res) => {
  try {
    const { actionType, limit = '50', offset = '0' } = req.query;

    const logs = await prisma.actionLog.findMany({
      where: actionType ? { actionType: actionType as string } : undefined,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.actionLog.count();

    res.json({ logs, total });
  } catch (error) {
    console.error('Error fetching action logs:', error);
    res.status(500).json({ error: 'Failed to fetch action logs' });
  }
});

actionLogRouter.get('/stats', async (req, res) => {
  try {
    const stats = await prisma.actionLog.groupBy({
      by: ['actionType'],
      _count: true,
      orderBy: { _count: { actionType: 'desc' } },
    });

    const recent = await prisma.actionLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ stats, recent });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
