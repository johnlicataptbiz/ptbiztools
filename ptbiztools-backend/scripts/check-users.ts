import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

type CheckUserOptions = {
  names: string[];
  emails: string[];
  roles: string[];
  active?: boolean;
  limit: number;
};

function parseArgs(argv: string[]): CheckUserOptions {
  const options: CheckUserOptions = {
    names: [],
    emails: [],
    roles: [],
    limit: 50,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if ((arg === '--name' || arg === '-n') && next) {
      options.names.push(next);
      i += 1;
      continue;
    }

    if ((arg === '--email' || arg === '-e') && next) {
      options.emails.push(next);
      i += 1;
      continue;
    }

    if ((arg === '--role' || arg === '-r') && next) {
      options.roles.push(next.toLowerCase());
      i += 1;
      continue;
    }

    if (arg === '--active' && next) {
      options.active = next === 'true' ? true : next === 'false' ? false : undefined;
      i += 1;
      continue;
    }

    if ((arg === '--limit' || arg === '-l') && next) {
      const parsed = Number(next);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = Math.min(Math.floor(parsed), 250);
      }
      i += 1;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const orFilters = [
    ...options.names.map((name) => ({ name: { contains: name, mode: 'insensitive' as const } })),
    ...options.emails.map((email) => ({ email: { contains: email, mode: 'insensitive' as const } })),
  ];

  const where = {
    ...(orFilters.length > 0 ? { OR: orFilters } : {}),
    ...(options.roles.length > 0 ? { role: { in: options.roles } } : {}),
    ...(typeof options.active === 'boolean' ? { isActive: options.active } : {}),
  };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, isActive: true, updatedAt: true },
    orderBy: { name: 'asc' },
    take: options.limit,
  });

  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
