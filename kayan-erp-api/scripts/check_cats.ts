import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.item_categories.findMany();
  console.log('Categories:', cats);
}

main().catch(console.error).finally(() => prisma.$disconnect());
