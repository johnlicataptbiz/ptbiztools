import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { actionLogRouter } from './routes/actionLog.js';
import authRouter from './routes/auth.js';
import { analyticsRouter } from './routes/analytics.js';
import { plImportRouter } from './routes/plImport.js';
import transcriptRouter from './routes/transcript.js';
import { dannyToolsRouter } from './routes/dannyTools.js';
import { mem0Router } from './routes/mem0.js';
import { zoomRouter } from './routes/zoom.js';
import zoomConnectRouter from './routes/zoomConnect.js';
import { prisma } from './services/prisma.js';

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = '1.0.2';
const BUILD_TIMESTAMP = new Date().toISOString();
const DB_HOST = (process.env.DATABASE_URL || '').match(/@([^:/]+)/)?.[1] || 'missing';

const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '').split(','),
  'https://ptbiztools-frontend.vercel.app',
  'https://ptbizcoach.com',
  'https://www.ptbizcoach.com',
].map((origin) => origin?.trim()).filter(Boolean) as string[];

function isAllowedOrigin(origin: string) {
  if (configuredOrigins.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^http:\/\/localhost:\d+$/i.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/i.test(origin)) return true;
  return false;
}

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, isAllowedOrigin(origin));
  },
}));
app.use(cookieParser());
app.use(express.json({
  limit: '100mb',
  verify(req, _res, buf) {
    (req as { rawBody?: Buffer }).rawBody = buf;
  },
}));

app.use('/api/actions', actionLogRouter);
app.use('/api/auth', authRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/pl-imports', plImportRouter);
app.use('/api/transcripts', transcriptRouter);
app.use('/api/danny-tools', dannyToolsRouter);
app.use('/api/mem0', mem0Router);
app.use('/api/zoom', zoomRouter);
app.use('/api/zoom', zoomConnectRouter);

// Log all registered routes for debugging
console.log('[server] Registered routes:');
app._router.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    console.log(`  ${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
  } else if (r.name === 'router') {
    r.handle.stack.forEach((layer: any) => {
      if (layer.route) {
        const path = layer.route.path;
        const methods = Object.keys(layer.route.methods);
        console.log(`  ${methods.join(',')} ${r.regexp} -> ${path}`);
      }
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: VERSION, build: BUILD_TIMESTAMP, dbHost: DB_HOST });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ready',
      dbHost: DB_HOST,
      version: VERSION,
      build: BUILD_TIMESTAMP,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'not_ready',
      dbHost: DB_HOST,
      version: VERSION,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

async function main() {
  console.log(`DEPLOY MARKER 2026-03-14-1810`);
  console.log(`[server] RUNTIME DATABASE HOST: ${DB_HOST}`);
  console.log(`[server] Starting PT Biz Tools API v${VERSION} (built: ${BUILD_TIMESTAMP})`);
  console.log(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[server] Port: ${PORT}`);
  
  try {
    await prisma.$connect();
    console.log('[server] Database connected');
    // Note: Database schema is managed by Prisma migrations (see prisma/schema.prisma)
    // Run `npx prisma db push` or `npx prisma migrate dev` to sync the schema.
  } catch (error) {
    console.error('[server] Database connection error:', error);
  }
  
  app.listen(PORT, () => {
    console.log(`[server] PT Biz Tools API running on port ${PORT}`);
    console.log(`[server] Health check: http://localhost:${PORT}/health`);
  });
}

main();
