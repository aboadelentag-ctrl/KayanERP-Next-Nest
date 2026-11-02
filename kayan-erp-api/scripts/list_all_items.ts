import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.items.findMany({
    include: { item_categories: true },
    orderBy: { id: 'asc' }
  });
  console.log('ALL ITEMS IN DB:');
  for (const it of items) {
    console.log(`[${it.id}] ${it.item_name} | Cat: ${it.item_categories?.category_name} (${it.category_id}) | Price: ${it.base_price} | Unit: ${it.unit}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
