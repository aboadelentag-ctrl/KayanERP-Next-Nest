import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Sanitizing warehouses created_at...');
  const res1 = await prisma.$executeRawUnsafe(`
    UPDATE kayan.warehouses 
    SET created_at = NOW() 
    WHERE created_at = '-infinity' OR created_at < '2000-01-01'::timestamptz
  `);
  console.log('Warehouses updated:', res1);

  // Check if any other table has -infinity in created_at or updated_at
  const tables = [
    'items', 'item_categories', 'branches', 'companies', 'customers', 
    'sales_orders', 'sales_order_lines', 'stock_balances', 'users'
  ];

  for (const table of tables) {
    try {
      const res = await prisma.$executeRawUnsafe(`
        UPDATE kayan.${table} 
        SET created_at = NOW() 
        WHERE created_at = '-infinity' OR created_at < '2000-01-01'::timestamptz
      `);
      if (res > 0) {
        console.log(`Updated ${table} created_at: ${res} rows`);
      }
    } catch (e: any) {
      // column might not exist or other error
    }
  }

  // Now test normal Prisma query on warehouses
  const testW = await prisma.warehouses.findMany({ take: 3 });
  console.log('Prisma warehouses test success! Count:', testW.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
