import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { PrismaClient } from '@prisma/client';

export interface KnowledgeSeedDoc {
  slug: string;
  title: string;
  category: string;
  source: string;
  version: string;
  content: string;
  checksum: string;
}

export interface KnowledgeSeedResult {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
}

interface KnowledgeDocDefinition {
  slug: string;
  title: string;
  category: string;
  source: string;
  version: string;
  file: string;
}

const DOC_DIR_CANDIDATES = [
  resolve(__dirname, 'docs'),
  resolve(__dirname, '..', '..', 'src', 'knowledge', 'docs'),
  resolve(process.cwd(), 'src', 'knowledge', 'docs'),
  resolve(process.cwd(), 'ptbiztools-backend', 'src', 'knowledge', 'docs'),
];

const KNOWLEDGE_DOC_DEFINITIONS: KnowledgeDocDefinition[] = [
  {
    slug: 'discovery-call-grading-rubric',
    title: 'Discovery Call Grading Rubric',
    category: 'coaching',
    source: 'PT Biz Internal',
    version: '2026.02',
    file: 'discovery-call-grading-rubric.md',
  },
  {
    slug: 'pnl-grader-technical-spec',
    title: 'P&L Grader Technical Specification',
    category: 'technical',
    source: 'PT Biz Internal',
    version: '2026.02',
    file: 'pnl-grader-technical-spec.md',
  },
  {
    slug: 'cash-based-pt-financial-pl-research-2026-02',
    title: 'Cash-Based PT Financial P&L Research (Feb 2026)',
    category: 'financial',
    source: 'PT Biz Research',
    version: '2026.02',
    file: 'cash-based-pt-financial-pl-research-2026-02.md',
  },
];

async function readDoc(file: string): Promise<string> {
  for (const docDir of DOC_DIR_CANDIDATES) {
    try {
      const raw = await readFile(resolve(docDir, file), 'utf8');
      return raw.replace(/^\uFEFF/, '').trim();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Knowledge doc not found in candidate directories: ${file}`);
}

function computeChecksum(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function getKnowledgeSeedManifest(): Promise<KnowledgeSeedDoc[]> {
  const docs: KnowledgeSeedDoc[] = [];

  for (const definition of KNOWLEDGE_DOC_DEFINITIONS) {
    const content = await readDoc(definition.file);
    docs.push({
      slug: definition.slug,
      title: definition.title,
      category: definition.category,
      source: definition.source,
      version: definition.version,
      content,
      checksum: computeChecksum(content),
    });
  }

  return docs;
}

function hasDocChanged(
  existing: {
    title: string;
    content: string;
    category: string;
    source: string | null;
    version: string;
    checksum: string | null;
  },
  incoming: KnowledgeSeedDoc,
): boolean {
  return (
    existing.title !== incoming.title ||
    existing.content !== incoming.content ||
    existing.category !== incoming.category ||
    (existing.source || '') !== incoming.source ||
    existing.version !== incoming.version ||
    (existing.checksum || '') !== incoming.checksum
  );
}

export async function seedKnowledgeFromManifest(prisma: PrismaClient): Promise<KnowledgeSeedResult> {
  const manifest = await getKnowledgeSeedManifest();

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const doc of manifest) {
    const existingBySlug = await prisma.knowledgeDoc.findUnique({
      where: { slug: doc.slug },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        source: true,
        version: true,
        checksum: true,
      },
    });

    if (existingBySlug) {
      if (hasDocChanged(existingBySlug, doc)) {
        await prisma.knowledgeDoc.update({
          where: { id: existingBySlug.id },
          data: doc,
        });
        updated += 1;
      } else {
        unchanged += 1;
      }
      continue;
    }

    const legacyMatches = await prisma.knowledgeDoc.findMany({
      where: {
        OR: [
          { title: doc.title },
          { slug: null, title: { contains: doc.title.split('(')[0].trim(), mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        source: true,
        version: true,
        checksum: true,
      },
    });

    if (legacyMatches.length > 0) {
      const primary = legacyMatches[0];
      await prisma.knowledgeDoc.update({
        where: { id: primary.id },
        data: doc,
      });

      if (legacyMatches.length > 1) {
        await prisma.knowledgeDoc.deleteMany({
          where: { id: { in: legacyMatches.slice(1).map((row) => row.id) } },
        });
      }

      updated += 1;
      continue;
    }

    await prisma.knowledgeDoc.create({ data: doc });
    created += 1;
  }

  return {
    total: manifest.length,
    created,
    updated,
    unchanged,
  };
}
