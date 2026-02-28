import express from 'express';
import cors from 'cors';
import { actionLogRouter } from './routes/actionLog.js';
import { knowledgeDocRouter } from './routes/knowledgeDoc.js';
import { prisma } from './services/prisma.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/actions', actionLogRouter);
app.use('/api/knowledge', knowledgeDocRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');
    
    // Try to create tables if they don't exist (best effort)
    try {
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "ActionLog" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "actionType" TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata JSONB,
        "userId" TEXT,
        "sessionId" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`;
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "KnowledgeDoc" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        source TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`;
      console.log('Tables created or verified');
    } catch (e) {
      console.log('Table creation skipped (may already exist)');
    }
  } catch (error) {
    console.error('Database connection error:', error);
  }
  
  app.listen(PORT, () => {
    console.log(`PT Biz Tools API running on port ${PORT}`);
  });
}

main();
