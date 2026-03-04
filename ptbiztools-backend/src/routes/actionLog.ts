import { Prisma } from '@prisma/client';
import type { Request } from 'express';
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

interface SessionUser {
  id: string;
  role: string;
}

async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const userId = req.cookies?.ptbiz_user as string | undefined;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, title: true, teamSection: true },
  });

  if (!user) return null;
  return {
    id: user.id,
    role: resolveRole(user.role, user.teamSection, user.title),
  };
}

function resolveRole(
  role: string | null | undefined,
  teamSection: string | null | undefined,
  title: string | null | undefined,
): "admin" | "advisor" | "coach" {
  if (role === "admin" || role === "advisor" || role === "coach") {
    return role;
  }

  const section = (teamSection || "").trim();
  const loweredTitle = (title || "").toLowerCase();

  if (
    section === "Partners" ||
    section === "Acquisitions" ||
    section === "Client Success" ||
    loweredTitle.includes("ceo") ||
    loweredTitle.includes("cfo")
  ) {
    return "admin";
  }

  if (
    section === "Advisors" ||
    section === "Board" ||
    loweredTitle.includes("advisor")
  ) {
    return "advisor";
  }

  return "coach";
}

function isAdminRole(role: string | undefined) {
  return role === 'admin';
}

actionLogRouter.post('/', async (req, res) => {
  try {
    const { actionType, description, metadata, userId, sessionId } = req.body as ActionLogBody;

    if (!actionType || !description) {
      res.status(400).json({ error: 'actionType and description are required' });
      return;
    }

    const cookieUserId = req.cookies?.ptbiz_user as string | undefined;

    const log = await prisma.actionLog.create({
      data: {
        actionType,
        description,
        metadata: metadata as Prisma.InputJsonValue || undefined,
        userId: userId || cookieUserId || null,
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
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { actionType, limit = '50', offset = '0' } = req.query;
    const whereBase: Prisma.ActionLogWhereInput = {
      ...(actionType ? { actionType: actionType as string } : {}),
      ...(isAdminRole(sessionUser.role) ? {} : { userId: sessionUser.id }),
    };

    const logs = await prisma.actionLog.findMany({
      where: whereBase,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
    });

    const total = await prisma.actionLog.count({ where: whereBase });

    res.json({ logs, total });
  } catch (error) {
    console.error('Error fetching action logs:', error);
    res.status(500).json({ error: 'Failed to fetch action logs' });
  }
});

actionLogRouter.get('/stats', async (req, res) => {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const whereBase: Prisma.ActionLogWhereInput = isAdminRole(sessionUser.role)
      ? {}
      : { userId: sessionUser.id };

    const stats = await prisma.actionLog.groupBy({
      where: whereBase,
      by: ['actionType'],
      _count: true,
      orderBy: { _count: { actionType: 'desc' } },
    });

    const recent = await prisma.actionLog.findMany({
      where: whereBase,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ stats, recent });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
