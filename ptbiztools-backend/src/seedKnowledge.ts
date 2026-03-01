import { PrismaClient } from '@prisma/client';
import { seedKnowledgeFromManifest } from './knowledge/seedManifest.js';

const prisma = new PrismaClient();

async function main() {
  const result = await seedKnowledgeFromManifest(prisma);

  console.log('Knowledge docs seeded');
  console.log(`- total: ${result.total}`);
  console.log(`- created: ${result.created}`);
  console.log(`- updated: ${result.updated}`);
  console.log(`- unchanged: ${result.unchanged}`);

  const docs = await prisma.knowledgeDoc.findMany({
    select: { slug: true, title: true, category: true, version: true },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  });

  for (const doc of docs) {
    console.log(`- [${doc.category}] ${doc.title} (${doc.slug ?? 'no-slug'}) v${doc.version}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
