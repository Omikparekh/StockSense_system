import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Inbound Receipts Workflow Endpoints', () => {
  let adminToken = '';
  let testProductId: number;
  let createdReceiptId: number;
  let createdReceiptRef: string;

  beforeAll(async () => {
    await db.initSchema();

    const adminRes = await request(app).post('/api/v1/auth/login').send({
      loginId: 'admin',
      password: 'AdminPassword123!'
    });
    adminToken = adminRes.body.token;

    // Pick a test product
    const prod = await db.queryOne<{ id: number }>('SELECT id FROM products LIMIT 1');
    testProductId = prod ? prod.id : 1;
  });

  it('GET /api/v1/receipts should return seeded receipts', async () => {
    const res = await request(app).get('/api/v1/receipts');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const first = res.body.data[0];
    expect(first.reference).toMatch(/^WH\/IN\/\d{5}$/);
    expect(first.partner_name).toBeDefined();
  });

  it('GET /api/v1/receipts?search=Tata should filter by vendor name', async () => {
    const res = await request(app).get('/api/v1/receipts?search=Tata');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].partner_name).toContain('Tata Steel');
  });

  it('POST /api/v1/receipts as admin should create receipt with sequence WH/IN/0000X in Draft status', async () => {
    const res = await request(app)
      .post('/api/v1/receipts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        partner_name: 'Apex Raw Metals Global',
        scheduled_date: new Date().toISOString().slice(0, 10),
        notes: 'Priority raw material intake shipment',
        items: [
          {
            product_id: testProductId,
            demand_qty: 30
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reference).toMatch(/^WH\/IN\/\d{5}$/);
    expect(res.body.data.status).toBe('Draft');

    createdReceiptId = res.body.data.id;
    createdReceiptRef = res.body.data.reference;
  });

  it('GET /api/v1/receipts/:id should return receipt with line items', async () => {
    const res = await request(app).get(`/api/v1/receipts/${createdReceiptId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.receipt.reference).toBe(createdReceiptRef);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].demand_qty).toBe(30);
  });

  it('POST /api/v1/receipts/:id/mark-ready should transition to Ready', async () => {
    const res = await request(app)
      .post(`/api/v1/receipts/${createdReceiptId}/mark-ready`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const detail = await request(app).get(`/api/v1/receipts/${createdReceiptId}`);
    expect(detail.body.data.receipt.status).toBe('Ready');
  });

  it('POST /api/v1/receipts/:id/validate should atomically receive stock and write to ledger', async () => {
    // Get product on hand before validation
    const prodBefore = await request(app).get(`/api/v1/products/${testProductId}`);
    const onHandBefore = Number(prodBefore.body.data.product.on_hand);

    const res = await request(app)
      .post(`/api/v1/receipts/${createdReceiptId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            product_id: testProductId,
            done_qty: 30
          }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Done');

    // Verify stock incremented by 30
    const prodAfter = await request(app).get(`/api/v1/products/${testProductId}`);
    const onHandAfter = Number(prodAfter.body.data.product.on_hand);
    expect(onHandAfter).toBe(onHandBefore + 30);

    // Verify ledger entry in stock_history
    const ledgerEntry = await db.queryOne<any>(
      'SELECT * FROM stock_history WHERE reference = $1',
      [createdReceiptRef]
    );
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry.operation_type).toBe('IN');
    expect(ledgerEntry.quantity).toBe(30);
    expect(ledgerEntry.status).toBe('Done');
  });

  it('POST /api/v1/receipts/:id/validate on completed receipt should fail with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/receipts/${createdReceiptId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already been validated');
  });
});
