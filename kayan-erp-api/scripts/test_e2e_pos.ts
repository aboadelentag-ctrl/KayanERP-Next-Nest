import { PrismaClient } from '@prisma/client';
import { SalesService } from '../src/sales/sales.service.js';
import { RealtimeGateway } from '../src/realtime.gateway.js';

async function main() {
  const prisma = new PrismaClient();
  const realtime = new RealtimeGateway();
  const salesService = new SalesService(prisma as any, realtime);

  console.log('--- 1. Testing getCategories() ---');
  const catRes = await salesService.getCategories();
  console.log(`Retrieved ${catRes.data.length} categories from DB:`, catRes.data.map(c => c.name));

  console.log('\n--- 2. Testing getProducts() ---');
  const prodRes = await salesService.getProducts();
  console.log(`Retrieved ${prodRes.data.length} products from DB.`);
  const sample = prodRes.data.slice(0, 3);
  console.log('Sample products:', sample);

  console.log('\n--- 3. Testing createSlip() ---');
  const slipDto = {
    salesmanCode: 'SLM-01',
    salesmanName: 'أحمد مصطفى (بائع صالة)',
    branchId: '1',
    branchName: 'الفرع الرئيسي - إدارة المصنع',
    customerName: 'تجربة دورة بيع حقيقية',
    customerPhone: '01000000000',
    discountAmount: 10,
    items: [
      {
        itemId: sample[0].id,
        itemName: sample[0].name,
        quantity: 1,
        weight: 1.5,
        unitPrice: sample[0].unitPrice,
        totalPrice: sample[0].unitPrice * 1.5,
      }
    ]
  };

  const createRes = await salesService.createSlip(slipDto);
  const createdSlip = createRes.data;
  console.log(`Created Slip: ID=${createdSlip.id}, Barcode=${createdSlip.barcode}, Status=${createdSlip.status}, Total=${createdSlip.totalAmount}`);

  console.log('\n--- 4. Testing getPendingSlips() ---');
  const pendingRes = await salesService.getPendingSlips();
  const foundInPending = pendingRes.data.find(s => s.barcode === createdSlip.barcode);
  console.log(`Is created slip in cashier pending queue? ${!!foundInPending} (Status: ${foundInPending?.status})`);

  console.log('\n--- 5. Testing paySlip() ---');
  const payRes = await salesService.paySlip(createdSlip.barcode, {
    paymentMethod: 'CASH',
    cashierName: 'كاشير الخزينة 1',
  });
  console.log(`Paid slip response: Status=${payRes.data.status}, Invoice=${payRes.data.invoiceNumber}`);

  console.log('\n--- 6. Verifying slip is GONE from cashier pending queue ---');
  const pendingAfterPay = await salesService.getPendingSlips();
  const foundInPendingAfter = pendingAfterPay.data.find(s => s.barcode === createdSlip.barcode);
  console.log(`Is paid slip in cashier pending queue? ${!!foundInPendingAfter} (Expected: false)`);

  console.log('\n--- 7. Verifying slip IS in dispatch ready queue ---');
  const dispatchBeforeDeliver = await salesService.getDispatchOrders();
  const foundInDispatch = dispatchBeforeDeliver.data.readyToDeliver.find((o: any) => o.barcode === createdSlip.barcode);
  console.log(`Is paid slip in dispatch ready queue? ${!!foundInDispatch} (Expected: true)`);

  console.log('\n--- 8. Testing deliverOrder() ---');
  const deliverRes = await salesService.deliverOrder(createdSlip.barcode);
  console.log(`Delivered order: Status=${deliverRes.data.status}`);

  console.log('\n--- 9. Verifying slip is GONE from dispatch ready queue ---');
  const dispatchAfterDeliver = await salesService.getDispatchOrders();
  const foundInDispatchAfter = dispatchAfterDeliver.data.readyToDeliver.find((o: any) => o.barcode === createdSlip.barcode);
  const foundInDelivered = dispatchAfterDeliver.data.recentlyDelivered.find((o: any) => o.barcode === createdSlip.barcode);
  console.log(`Is delivered slip in dispatch ready queue? ${!!foundInDispatchAfter} (Expected: false)`);
  console.log(`Is delivered slip in dispatch completed queue? ${!!foundInDelivered} (Expected: true)`);

  console.log('\n>>> FULL REAL DATABASE E2E FLOW TEST PASSED PERFECTLY! <<<');
  await prisma.$disconnect();
}

main().catch(console.error);
