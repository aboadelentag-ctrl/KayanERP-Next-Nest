import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding and updating categories & products in Neon PostgreSQL...');

  // 1. Categories
  const categoriesData = [
    { name: 'حلويات شرقية', code: 'CAT-EASTERN', type: 'منتج تام', desc: 'بسبوسة، كنافة، بقلاوة، بلح الشام، هريسة' },
    { name: 'حلويات غربية وتورت', code: 'CAT-WESTERN', type: 'منتج تام', desc: 'تورتات، جاتوهات، إكلير، ميلفيه، كب كيك' },
    { name: 'نواعم ومخبوزات', code: 'CAT-BAKERY', type: 'منتج تام', desc: 'كعك، بسكويت، بيتي فور، غريبة، باتيه، كرواسون' },
    { name: 'شوكولاتة وهدايا', code: 'CAT-CHOCO', type: 'منتج تام', desc: 'شوكولاتة بلجيكي، علب هدايا، دراجيه' },
    { name: 'تسالي ومكسرات', code: 'CAT-NUTS', type: 'منتج تام', desc: 'فستق، كاجو، لوز، عين جمل، بن' },
  ];

  const catMap: Record<string, bigint> = {};

  for (const c of categoriesData) {
    const existing = await prisma.item_categories.findFirst({
      where: {
        company_id: BigInt(1),
        OR: [{ category_name: c.name }, { category_code: c.code }]
      }
    });

    if (existing) {
      catMap[c.name] = existing.id;
      console.log(`Category exists: [${existing.id}] ${existing.category_name}`);
    } else {
      const created = await prisma.item_categories.create({
        data: {
          company_id: BigInt(1),
          category_name: c.name,
          category_code: c.code,
          item_type: c.type,
          description: c.desc,
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }
      });
      catMap[c.name] = created.id;
      console.log(`Created category: [${created.id}] ${created.category_name}`);
    }
  }

  // 2. Map existing items to appropriate categories & update prices
  const itemUpdates: Array<{ namePattern: string; catName: string; price?: number; unit?: string }> = [
    { namePattern: 'بسبوسه', catName: 'حلويات شرقية', price: 220, unit: 'كجم' },
    { namePattern: 'جاتوه', catName: 'حلويات غربية وتورت', price: 50, unit: 'قطعة' },
    { namePattern: 'تورتة', catName: 'حلويات غربية وتورت', price: 450, unit: 'قطعة' },
    { namePattern: 'فطير', catName: 'نواعم ومخبوزات', price: 60, unit: 'قطعة' },
    { namePattern: 'باتيه', catName: 'نواعم ومخبوزات', price: 25, unit: 'قطعة' },
    { namePattern: 'كرواسون', catName: 'نواعم ومخبوزات', price: 30, unit: 'قطعة' },
    { namePattern: 'شيكولاتة', catName: 'شوكولاتة وهدايا', price: 380, unit: 'كجم' },
    { namePattern: 'حلويات شرقية', catName: 'حلويات شرقية', price: 220, unit: 'كجم' },
  ];

  for (const upd of itemUpdates) {
    const targetCatId = catMap[upd.catName];
    if (targetCatId) {
      const matched = await prisma.items.findMany({
        where: {
          item_name: { contains: upd.namePattern }
        }
      });
      for (const m of matched) {
        await prisma.items.update({
          where: { id: m.id },
          data: {
            category_id: targetCatId,
            base_price: upd.price !== undefined && Number(m.base_price) === 0 ? upd.price : m.base_price,
            unit: upd.unit || m.unit,
          }
        });
        console.log(`Updated item [${m.id}] ${m.item_name} -> Category: ${upd.catName}`);
      }
    }
  }

  // 3. Add distinctive items for pastry categories to guarantee rich catalog in DB
  const newItems = [
    // حلويات شرقية
    { name: 'كنافة أساور نوتيلا وبندق', code: 'EAS-001', cat: 'حلويات شرقية', price: 240, unit: 'كجم', barcode: '6221001001' },
    { name: 'هريسة إسكندراني لوز فاخر', code: 'EAS-002', cat: 'حلويات شرقية', price: 210, unit: 'كجم', barcode: '6221001002' },
    { name: 'بقلاوة كل واشكر فستق', code: 'EAS-003', cat: 'حلويات شرقية', price: 340, unit: 'كجم', barcode: '6221001003' },
    { name: 'بلح الشام بالقشطة والفسدق', code: 'EAS-004', cat: 'حلويات شرقية', price: 180, unit: 'كجم', barcode: '6221001004' },
    { name: 'أصابع زينب بالسمن البلدي', code: 'EAS-005', cat: 'حلويات شرقية', price: 150, unit: 'كجم', barcode: '6221001005' },

    // حلويات غربية وتورت
    { name: 'تورتة سبيشيال كروكان مقاس 26', code: 'WST-001', cat: 'حلويات غربية وتورت', price: 450, unit: 'قطعة', barcode: '6221002001' },
    { name: 'تورتة فاكهة سوبر مقاس 24', code: 'WST-002', cat: 'حلويات غربية وتورت', price: 380, unit: 'قطعة', barcode: '6221002002' },
    { name: 'إكلير وميلفيه شوكولاتة ولوتس', code: 'WST-003', cat: 'حلويات غربية وتورت', price: 220, unit: 'كجم', barcode: '6221002003' },
    { name: 'تشيز كيك توت أزرق فاخر', code: 'WST-004', cat: 'حلويات غربية وتورت', price: 70, unit: 'قطعة', barcode: '6221002004' },

    // نواعم ومخبوزات
    { name: 'كعك سادة بالسمن البلدي الفاخر', code: 'BAK-001', cat: 'نواعم ومخبوزات', price: 240, unit: 'كجم', barcode: '6221003001' },
    { name: 'كعك عين جمل ومكسرات', code: 'BAK-002', cat: 'نواعم ومخبوزات', price: 320, unit: 'كجم', barcode: '6221003002' },
    { name: 'بسكويت نشادر وبرتقال فاخر', code: 'BAK-003', cat: 'نواعم ومخبوزات', price: 200, unit: 'كجم', barcode: '6221003003' },
    { name: 'بيتي فور لوكس ميكس شوكولاتة', code: 'BAK-004', cat: 'نواعم ومخبوزات', price: 260, unit: 'كجم', barcode: '6221003004' },
    { name: 'غريبة بالسمن البلدي والفستق', code: 'BAK-005', cat: 'نواعم ومخبوزات', price: 250, unit: 'كجم', barcode: '6221003005' },
    { name: 'معمول بالتمر والمكسرات', code: 'BAK-006', cat: 'نواعم ومخبوزات', price: 260, unit: 'كجم', barcode: '6221003006' },

    // شوكولاتة وهدايا
    { name: 'علبة شوكولاتة بلجيكي ميكس لوكس', code: 'CHO-001', cat: 'شوكولاتة وهدايا', price: 480, unit: 'علبة', barcode: '6221004001' },
    { name: 'شوكولاتة كافيار حليب وبندق', code: 'CHO-002', cat: 'شوكولاتة وهدايا', price: 550, unit: 'كجم', barcode: '6221004002' },

    // تسالي ومكسرات
    { name: 'فستق أمريكي محمص ومملح', code: 'NUT-001', cat: 'تسالي ومكسرات', price: 780, unit: 'كجم', barcode: '6221005001' },
    { name: 'كاجو هندي جامبو محمص', code: 'NUT-002', cat: 'تسالي ومكسرات', price: 690, unit: 'كجم', barcode: '6221005002' },
    { name: 'لوز أمريكي محمص خفيف', code: 'NUT-003', cat: 'تسالي ومكسرات', price: 540, unit: 'كجم', barcode: '6221005003' },
  ];

  for (const it of newItems) {
    const catId = catMap[it.cat];
    if (!catId) continue;

    const existing = await prisma.items.findFirst({
      where: {
        company_id: BigInt(1),
        OR: [{ item_name: it.name }, { item_code: it.code }]
      }
    });

    if (existing) {
      await prisma.items.update({
        where: { id: existing.id },
        data: {
          category_id: catId,
          base_price: it.price,
          unit: it.unit,
          barcode: it.barcode,
          active: true,
        }
      });
      console.log(`Updated item: [${existing.id}] ${it.name}`);
    } else {
      const created = await prisma.items.create({
        data: {
          company_id: BigInt(1),
          item_name: it.name,
          item_code: it.code,
          item_type: 'منتج تام',
          category_id: catId,
          unit: it.unit,
          base_price: it.price,
          barcode: it.barcode,
          active: true,
          created_at: new Date(),
        }
      });
      console.log(`Created new item: [${created.id}] ${it.name}`);
    }
  }

  console.log('Seeding finished successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
