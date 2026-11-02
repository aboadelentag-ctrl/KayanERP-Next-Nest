import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.companies.findMany({ take: 5 });
  console.log('COMPANIES:', JSON.stringify(companies, (k, v) => typeof v === 'bigint' ? v.toString() : v));

  const warehouses = await prisma.warehouses.findMany({ take: 5 });
  console.log('WAREHOUSES:', JSON.stringify(warehouses, (k, v) => typeof v === 'bigint' ? v.toString() : v));

  const categories = await prisma.item_categories.findMany();
  console.log('CATEGORIES COUNT:', categories.length);
  console.log('CATEGORIES:', JSON.stringify(categories, (k, v) => typeof v === 'bigint' ? v.toString() : v));

  const itemsCount = await prisma.items.count();
  console.log('ITEMS COUNT:', itemsCount);
  const items = await prisma.items.findMany({ take: 10 });
  console.log('SAMPLE ITEMS:', JSON.stringify(items, (k, v) => typeof v === 'bigint' ? v.toString() : v));

  const ordersCount = await prisma.sales_orders.count();
  console.log('SALES ORDERS COUNT:', ordersCount);
  const orders = await prisma.sales_orders.findMany({ take: 5 });
  console.log('SAMPLE ORDERS:', JSON.stringify(orders, (k, v) => typeof v === 'bigint' ? v.toString() : v));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
