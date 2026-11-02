import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branches.findMany();
  console.log('BRANCHES:', JSON.stringify(branches, (k, v) => typeof v === 'bigint' ? v.toString() : v));
}

main().catch(console.error).finally(() => prisma.$disconnect());
