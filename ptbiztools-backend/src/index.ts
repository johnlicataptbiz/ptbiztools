import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { actionLogRouter } from './routes/actionLog.js';
import authRouter from './routes/auth.js';
import { analyticsRouter } from './routes/analytics.js';
import { plImportRouter } from './routes/plImport.js';
import transcriptRouter from './routes/transcript.js';
import { dannyToolsRouter } from './routes/dannyTools.js';
import { zoomRouter } from './routes/zoom.js';
import { prisma } from './services/prisma.js';

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use('/api/zoom', zoomRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.1' });
});

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');
    // Note: Database schema is managed by Prisma migrations (see prisma/schema.prisma)
    // Run `npx prisma db push` or `npx prisma migrate dev` to sync the schema.
  } catch (error) {
    console.error('Database connection error:', error);
  }
  
  app.listen(PORT, () => {
    console.log(`PT Biz Tools API running on port ${PORT}`);
  });
}

main();
