import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_USER_IDS = [
  '6c29ecc2-83aa-4278-8df7-9f79117f0d93', // Jack Licata
  'a7aec13a-dbdb-4097-9c52-1bf67a686582', // John Licata
];

async function main() {
  console.log('Deleting login events for dev users...');

  const result = await prisma.loginEvent.deleteMany({
    where: {
      userId: {
        in: DEV_USER_IDS,
      },
    },
  });

  console.log(`Deleted ${result.count} login events.`);

  // Verify remaining
  const remaining = await prisma.loginEvent.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nRemaining login events (${remaining.length} total):`);
  for (const e of remaining) {
    const name = e.user?.name ?? 'Unknown';
    const ts = e.createdAt.toISOString().slice(0, 16);
    console.log(`  ${ts}  ${name}  [${e.ipAddress ?? 'no-ip'}]`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
