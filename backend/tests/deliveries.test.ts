import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Outbound Delivery Orders Workflow Endpoints', () => {
  let adminToken = '';
  let sufficientProductId: number;
  let outOfStockProductId: number;
  let createdDeliveryId: number;
  let createdDeliveryRef: string;

  beforeAll(async () => {
    await db.initSchema();

    const adminRes = await request(app).post('/api/v1/auth/login').send({
      loginId: 'admin',
      password: 'AdminPassword123!'
    });
    adminToken = adminRes.body.token;

    // Sufficient stock: Steel Rods
    const prod1 = await db.queryOne<{ id: number }>("SELECT id FROM products WHERE sku = 'STL-ROD-01'");
    sufficientProductId = prod1 ? prod1.id : 1;

    // Out of stock product: Electric Motors
    const prod2 = await db.queryOne<{ id: number }>("SELECT id FROM products WHERE sku = 'MTR-ELC-06'");
    outOfStockProductId = prod2 ? prod2.id : 2;
  });

  it('GET /api/v1/deliveries should return seeded delivery orders', async () => {
    const res = await request(app).get('/api/v1/deliveries');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const first = res.body.data[0];
    expect(first.reference).toMatch(/^WH\/OUT\/\d{5}$/);
    expect(first.partner_name).toBeDefined();
  });

  it('GET /api/v1/deliveries?status=Waiting should return orders with stock shortages', async () => {
    const res = await request(app).get('/api/v1/deliveries?status=Waiting');

    expect(res.status).toBe(200);
    expect(res.body.data.some((d: any) => d.status === 'Waiting')).toBe(true);
  });

  it('POST /api/v1/deliveries with available stock should automatically evaluate to Ready', async () => {
    const res = await request(app)
      .post('/api/v1/deliveries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        partner_name: 'Fast Track Logistics Partner',
        scheduled_date: new Date().toISOString().slice(0, 10),
        notes: 'Priority morning delivery batch',
        items: [
          {
            product_id: sufficientProductId,
            demand_qty: 5
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reference).toMatch(/^WH\/OUT\/\d{5}$/);
    expect(res.body.data.status).toBe('Ready');

    createdDeliveryId = res.body.data.id;
    createdDeliveryRef = res.body.data.reference;
  });

  it('POST /api/v1/deliveries with insufficient stock should automatically evaluate to Waiting', async () => {
    const res = await request(app)
      .post('/api/v1/deliveries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        partner_name: 'Metro Mega Works',
        scheduled_date: new Date().toISOString().slice(0, 10),
        items: [
          {
            product_id: outOfStockProductId,
            demand_qty: 50 // Electric Motors has 0 stock on hand
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Waiting');
  });

  it('POST /api/v1/deliveries/:id/validate should atomically deduct stock and write to ledger', async () => {
    // Check stock before
    const prodBefore = await request(app).get(`/api/v1/products/${sufficientProductId}`);
    const onHandBefore = Number(prodBefore.body.data.product.on_hand);

    const res = await request(app)
      .post(`/api/v1/deliveries/${createdDeliveryId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            product_id: sufficientProductId,
            done_qty: 5
          }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Done');

    // Verify stock deducted by 5
    const prodAfter = await request(app).get(`/api/v1/products/${sufficientProductId}`);
    const onHandAfter = Number(prodAfter.body.data.product.on_hand);
    expect(onHandAfter).toBe(onHandBefore - 5);

    // Verify ledger entry in stock_history
    const ledgerEntry = await db.queryOne<any>(
      'SELECT * FROM stock_history WHERE reference = $1',
      [createdDeliveryRef]
    );
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry.operation_type).toBe('OUT');
    expect(ledgerEntry.quantity).toBe(5);
    expect(ledgerEntry.status).toBe('Done');
  });

  it('POST /api/v1/deliveries/:id/validate on completed delivery should fail with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/deliveries/${createdDeliveryId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already been validated');
  });
});
