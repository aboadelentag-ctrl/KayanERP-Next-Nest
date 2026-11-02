import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rawWarehouses = await prisma.$queryRawUnsafe(`SELECT id, warehouse_name, created_at::text, updated_at::text FROM kayan.warehouses LIMIT 5`);
  console.log('RAW WAREHOUSES:', JSON.stringify(rawWarehouses, (k, v) => typeof v === 'bigint' ? v.toString() : v));

  const rawCategories = await prisma.$queryRawUnsafe(`SELECT id, category_name, category_code, created_at::text FROM kayan.item_categories`);
  console.log('RAW CATEGORIES:', JSON.stringify(rawCategories, (k, v) => typeof v === 'bigint' ? v.toString() : v));

  const rawItems = await prisma.$queryRawUnsafe(`SELECT id, item_name, item_code, base_price, category_id, created_at::text FROM kayan.items LIMIT 15`);
  console.log('RAW ITEMS:', JSON.stringify(rawItems, (k, v) => typeof v === 'bigint' ? v.toString() : v));

  const rawOrders = await prisma.$queryRawUnsafe(`SELECT id, order_number, slip_number, status, total_amount, created_at::text FROM kayan.sales_orders LIMIT 10`);
  console.log('RAW ORDERS:', JSON.stringify(rawOrders, (k, v) => typeof v === 'bigint' ? v.toString() : v));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
