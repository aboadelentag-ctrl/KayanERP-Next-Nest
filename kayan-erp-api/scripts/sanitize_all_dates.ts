import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const timestampCols: any[] = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'kayan' 
      AND data_type IN ('timestamp with time zone', 'timestamp without time zone', 'date')
  `);

  console.log(`Found ${timestampCols.length} timestamp/date columns in kayan schema.`);

  for (const col of timestampCols) {
    try {
      const q = `
        UPDATE kayan."${col.table_name}" 
        SET "${col.column_name}" = NOW() 
        WHERE "${col.column_name}" < '2000-01-01'::timestamptz 
           OR "${col.column_name}" > '2100-01-01'::timestamptz
      `;
      const updated = await prisma.$executeRawUnsafe(q);
      if (updated > 0) {
        console.log(`Fixed ${updated} rows in ${col.table_name}.${col.column_name}`);
      }
    } catch (err: any) {
      // ignore
    }
  }
  console.log('Sanitization of timestamps complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
