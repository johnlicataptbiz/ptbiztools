import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response, Router } from 'express';
import { buildTranscriptPrivacyArtifacts } from '../scoring/redaction.js';
import { prisma } from '../services/prisma.js';

interface SessionRequest extends Request {
  currentUserId?: string;
  currentUserRole?: string;
  currentUserName?: string;
}

interface GradePayload {
  score: number;
  outcome: string;
  summary: string;
  phaseScores: unknown;
  strengths: unknown;
  improvements: unknown;
  redFlags: unknown;
  deidentifiedTranscript?: string;
  transcript?: string;
  gradingVersion?: string;
  deterministic?: unknown;
  criticalBehaviors?: unknown;
  confidence?: number;
  qualityGate?: unknown;
  evidence?: unknown;
  transcriptHash?: string;
}

interface CoachingAnalysisBody {
  sessionId?: string;
  coachName?: string;
  clientName?: string;
  callDate?: string;
  grade?: GradePayload;
}

interface PdfExportBody {
  sessionId?: string;
  coachingAnalysisId?: string;
  coachName?: string;
  clientName?: string;
  callDate?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export const analyticsRouter = Router();

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return {};
  return value as Prisma.InputJsonValue;
}

function extractEvidencePayload(grade: GradePayload): Prisma.InputJsonValue {
  if (grade.evidence !== undefined) return safeJson(grade.evidence);

  const phaseScores = grade.phaseScores as
    | Record<string, { evidence?: string[] }>
    | undefined;
  const criticalBehaviors = grade.criticalBehaviors as
    | Record<string, { evidence?: string[] }>
    | undefined;

  if (!phaseScores && !criticalBehaviors) return safeJson({});

  return safeJson({
    phases: phaseScores || {},
    criticalBehaviors: criticalBehaviors || {},
  });
}

function getClientIp(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || null;
}

async function attachSessionUser(req: SessionRequest, _res: Response, next: NextFunction) {
  try {
    const userId = req.cookies?.ptbiz_user;
    if (!userId) return next();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true },
    });

    if (user) {
      req.currentUserId = user.id;
      req.currentUserRole = user.role;
      req.currentUserName = user.name;
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

function requireAdmin(req: SessionRequest, res: Response, next: NextFunction) {
  if (!req.currentUserId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.currentUserRole !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

function isAdminRole(role?: string) {
  return role === 'admin';
}

analyticsRouter.use(attachSessionUser);

analyticsRouter.post('/coaching-analyses', requireAuth, async (req: SessionRequest, res: Response) => {
  try {
    const { sessionId, coachName, clientName, callDate, grade } = req.body as CoachingAnalysisBody;

    if (!grade) {
      res.status(400).json({ error: 'grade payload is required' });
      return;
    }

    if (typeof grade.score !== 'number' || !grade.summary) {
      res.status(400).json({ error: 'Invalid grade payload' });
      return;
    }

    const transcriptSource = typeof grade.transcript === 'string'
      ? grade.transcript
      : grade.deidentifiedTranscript;
    if (!transcriptSource || transcriptSource.trim().length === 0) {
      res.status(400).json({ error: 'Transcript content is required in grade payload' });
      return;
    }

    const privacy = buildTranscriptPrivacyArtifacts(transcriptSource);

    const analysis = await prisma.coachingAnalysis.create({
      data: {
        userId: req.currentUserId,
        sessionId: sessionId || null,
        coachName: coachName || null,
        clientName: clientName || null,
        callDate: callDate || null,
        score: grade.score,
        outcome: grade.outcome || 'UNKNOWN',
        summary: grade.summary,
        phaseScores: safeJson(grade.phaseScores),
        strengths: safeJson(grade.strengths),
        improvements: safeJson(grade.improvements),
        redFlags: safeJson(grade.redFlags),
        gradingVersion: grade.gradingVersion || 'v1',
        deterministic: grade.deterministic !== undefined ? safeJson(grade.deterministic) : undefined,
        criticalBehaviors: grade.criticalBehaviors !== undefined ? safeJson(grade.criticalBehaviors) : undefined,
        confidence: typeof grade.confidence === 'number' ? grade.confidence : null,
        qualityGate: grade.qualityGate !== undefined ? safeJson(grade.qualityGate) : undefined,
        evidence: extractEvidencePayload(grade),
        transcriptHash: grade.transcriptHash || privacy.transcriptHash,
        deidentifiedTranscript: privacy.redactedTranscript,
      },
    });

    await prisma.actionLog.create({
      data: {
        userId: req.currentUserId,
        sessionId: sessionId || null,
        actionType: 'coaching_analysis_saved',
        description: `Coaching analysis saved for ${clientName || 'unknown client'}`,
        metadata: {
          score: grade.score,
          outcome: grade.outcome || 'UNKNOWN',
          analysisId: analysis.id,
        } as Prisma.InputJsonValue,
      },
    });

    res.json({ analysis });
  } catch (error) {
    console.error('Error creating coaching analysis:', error);
    res.status(500).json({ error: 'Failed to save coaching analysis' });
  }
});

analyticsRouter.post('/pdf-exports', requireAuth, async (req: SessionRequest, res: Response) => {
  try {
    const {
      sessionId,
      coachingAnalysisId,
      coachName,
      clientName,
      callDate,
      score,
      metadata,
    } = req.body as PdfExportBody;

    const pdfExport = await prisma.pdfExport.create({
      data: {
        userId: req.currentUserId,
        sessionId: sessionId || null,
        coachingAnalysisId: coachingAnalysisId || null,
        coachName: coachName || null,
        clientName: clientName || null,
        callDate: callDate || null,
        score: typeof score === 'number' ? score : null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });

    await prisma.actionLog.create({
      data: {
        userId: req.currentUserId,
        sessionId: sessionId || null,
        actionType: 'pdf_export_saved',
        description: `PDF export saved for ${clientName || 'unknown client'}`,
        metadata: {
          score: typeof score === 'number' ? score : null,
          pdfExportId: pdfExport.id,
          coachingAnalysisId: coachingAnalysisId || null,
        } as Prisma.InputJsonValue,
      },
    });

    res.json({ pdfExport });
  } catch (error) {
    console.error('Error creating pdf export record:', error);
    res.status(500).json({ error: 'Failed to save PDF export record' });
  }
});

analyticsRouter.get('/admin-summary', requireAdmin, async (req: SessionRequest, res: Response) => {
  try {
    const rawDays = Number.parseInt(String(req.query.days || '30'), 10);
    const days = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 120) : 30;

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const [loginEvents, analyses, pdfExports, actions] = await Promise.all([
      prisma.loginEvent.findMany({
        where: { createdAt: { gte: since }, success: true },
        include: { user: { select: { id: true, name: true, title: true, teamSection: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.coachingAnalysis.findMany({
        where: { createdAt: { gte: since } },
        include: { user: { select: { id: true, name: true, title: true, teamSection: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.pdfExport.findMany({
        where: { createdAt: { gte: since } },
        include: { user: { select: { id: true, name: true, title: true, teamSection: true } } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.actionLog.findMany({
        where: { createdAt: { gte: since } },
        include: { user: { select: { id: true, name: true, title: true, teamSection: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const uniqueUsers = new Set<string>();
    for (const event of loginEvents) if (event.userId) uniqueUsers.add(event.userId);
    for (const analysis of analyses) if (analysis.userId) uniqueUsers.add(analysis.userId);
    for (const exportRow of pdfExports) if (exportRow.userId) uniqueUsers.add(exportRow.userId);

    const byDay = [] as Array<{ date: string; label: string; logins: number; analyses: number; pdfs: number }>;

    for (let i = 0; i < days; i += 1) {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const key = toDayKey(day);

      byDay.push({
        date: key,
        label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        logins: loginEvents.filter((event) => toDayKey(event.createdAt) === key).length,
        analyses: analyses.filter((analysis) => toDayKey(analysis.createdAt) === key).length,
        pdfs: pdfExports.filter((exportRow) => toDayKey(exportRow.createdAt) === key).length,
      });
    }

    const userUsageMap = new Map<string, {
      userId: string;
      name: string;
      title: string | null;
      teamSection: string | null;
      logins: number;
      analyses: number;
      pdfs: number;
    }>();

    const touchUser = (userId: string | null, name: string | null, title: string | null, teamSection: string | null) => {
      if (!userId) return;
      if (!userUsageMap.has(userId)) {
        userUsageMap.set(userId, {
          userId,
          name: name || 'Unknown User',
          title: title || null,
          teamSection: teamSection || null,
          logins: 0,
          analyses: 0,
          pdfs: 0,
        });
      }
      return userUsageMap.get(userId)!;
    };

    for (const event of loginEvents) {
      const entry = touchUser(event.userId, event.user?.name || null, event.user?.title || null, event.user?.teamSection || null);
      if (entry) entry.logins += 1;
    }

    for (const analysis of analyses) {
      const entry = touchUser(analysis.userId, analysis.user?.name || null, analysis.user?.title || null, analysis.user?.teamSection || null);
      if (entry) entry.analyses += 1;
    }

    for (const exportRow of pdfExports) {
      const entry = touchUser(exportRow.userId, exportRow.user?.name || null, exportRow.user?.title || null, exportRow.user?.teamSection || null);
      if (entry) entry.pdfs += 1;
    }

    const topUsers = Array.from(userUsageMap.values())
      .sort((a, b) => (b.logins + b.analyses + b.pdfs) - (a.logins + a.analyses + a.pdfs))
      .slice(0, 10);

    res.json({
      window: { days, since: since.toISOString() },
      totals: {
        successfulLogins: loginEvents.length,
        coachingAnalyses: analyses.length,
        pdfExports: pdfExports.length,
        activeUsers: uniqueUsers.size,
      },
      byDay,
      topUsers,
      recent: {
        loginEvents: loginEvents.slice(0, 10),
        analyses: analyses.slice(0, 10),
        pdfExports: pdfExports.slice(0, 10),
        actions,
      },
    });
  } catch (error) {
    console.error('Error building admin summary:', error);
    res.status(500).json({ error: 'Failed to build admin usage summary' });
  }
});

analyticsRouter.get('/coaching-analyses', requireAuth, async (req: SessionRequest, res: Response) => {
  try {
    const rawLimit = Number.parseInt(String(req.query.limit || '50'), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;

    const where = isAdminRole(req.currentUserRole)
      ? undefined
      : { userId: req.currentUserId };

    const analyses = await prisma.coachingAnalysis.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, title: true, teamSection: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ analyses, total: analyses.length });
  } catch (error) {
    console.error('Error fetching coaching analyses:', error);
    res.status(500).json({ error: 'Failed to fetch coaching analyses' });
  }
});

analyticsRouter.get('/pdf-exports', requireAuth, async (req: SessionRequest, res: Response) => {
  try {
    const rawLimit = Number.parseInt(String(req.query.limit || '100'), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 300) : 100;

    const where = isAdminRole(req.currentUserRole)
      ? undefined
      : { userId: req.currentUserId };

    const pdfExports = await prisma.pdfExport.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, title: true, teamSection: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ pdfExports, total: pdfExports.length });
  } catch (error) {
    console.error('Error fetching pdf exports:', error);
    res.status(500).json({ error: 'Failed to fetch PDF exports' });
  }
});

analyticsRouter.get('/pl-audits', requireAuth, async (req: SessionRequest, res: Response) => {
  try {
    const rawLimit = Number.parseInt(String(req.query.limit || '100'), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 300) : 100;

    const where: Prisma.ActionLogWhereInput = {
      actionType: 'pl_report_generated',
      ...(isAdminRole(req.currentUserRole) ? {} : { userId: req.currentUserId }),
    };

    const audits = await prisma.actionLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, title: true, teamSection: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ audits, total: audits.length });
  } catch (error) {
    console.error('Error fetching p&l audits:', error);
    res.status(500).json({ error: 'Failed to fetch P&L audits' });
  }
});

