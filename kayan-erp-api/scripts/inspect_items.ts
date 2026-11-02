import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.item_categories.findMany({
    include: {
      items: {
        select: {
          id: true,
          item_code: true,
          item_name: true,
          base_price: true,
          unit: true,
          active: true,
        }
      }
    }
  });

  console.log('Categories & Items in DB:');
  for (const c of cats) {
    console.log(`Category: [${c.id}] ${c.category_name} (${c.items.length} items)`);
    for (const it of c.items.slice(0, 5)) {
      console.log(`   - [${it.id}] ${it.item_name} | Price: ${it.base_price} | Unit: ${it.unit}`);
    }
  }

  const allItems = await prisma.items.findMany({
    where: { active: true },
    select: {
      id: true,
      item_name: true,
      item_code: true,
      category_id: true,
      base_price: true,
      unit: true,
    }
  });
  console.log(`Total active items in DB: ${allItems.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
