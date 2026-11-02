import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE kayan.sales_orders 
      ADD COLUMN IF NOT EXISTS slip_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS salesman_id BIGINT,
      ADD COLUMN IF NOT EXISTS salesman_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS cashier_id BIGINT,
      ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS dispatcher_id BIGINT,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ
    `);
    console.log('COLUMNS_ADDED_SUCCESSFULLY');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_sales_orders_slip_number ON kayan.sales_orders (slip_number)
    `);
    console.log('INDEX_CREATED_SUCCESSFULLY');
  } catch (err) {
    console.error('Error executing alter table:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
