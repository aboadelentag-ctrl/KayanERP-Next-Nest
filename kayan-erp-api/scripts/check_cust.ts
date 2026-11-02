import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const custs = await prisma.customers.findMany({ take: 5 });
  console.log('CUSTOMERS:', JSON.stringify(custs, (k, v) => typeof v === 'bigint' ? v.toString() : v));
}

main().catch(console.error).finally(() => prisma.$disconnect());
