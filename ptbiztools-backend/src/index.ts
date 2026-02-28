import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { actionLogRouter } from './routes/actionLog.js';
import { knowledgeDocRouter } from './routes/knowledgeDoc.js';
import videoRouter from './routes/video.js';
import authRouter from './routes/auth.js';
import { analyticsRouter } from './routes/analytics.js';
import { prisma } from './services/prisma.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Restrict CORS to frontend URL in production, fallback to localhost for dev
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '100mb' }));

app.use('/api/actions', actionLogRouter);
app.use('/api/knowledge', knowledgeDocRouter);
app.use('/api/videos', videoRouter);
app.use('/api/auth', authRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
