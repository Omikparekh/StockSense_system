import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Internal Transfers Workflow Endpoints', () => {
  let adminToken = '';
  let stockLocId: number;
  let outputLocId: number;
  let testProductId: number;
  let createdTransferId: number;
  let createdTransferRef: string;

  beforeAll(async () => {
    await db.initSchema();

    const adminRes = await request(app).post('/api/v1/auth/login').send({
      loginId: 'admin',
      password: 'AdminPassword123!'
    });
    adminToken = adminRes.body.token;

    const stock = await db.queryOne<{ id: number }>("SELECT id FROM locations WHERE path = 'WH/Stock'");
    stockLocId = stock ? stock.id : 1;

    const output = await db.queryOne<{ id: number }>("SELECT id FROM locations WHERE path = 'WH/Output'");
    outputLocId = output ? output.id : 2;

    const prod = await db.queryOne<{ id: number }>("SELECT id FROM products WHERE sku = 'BOX-PKG-07'");
    testProductId = prod ? prod.id : 1;
  });

  it('GET /api/v1/transfers should return seeded transfers', async () => {
    const res = await request(app).get('/api/v1/transfers');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const first = res.body.data[0];
    expect(first.reference).toMatch(/^WH\/INT\/\d{5}$/);
  });

  it('POST /api/v1/transfers with same source and destination should fail with 400', async () => {
    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        source_location_id: stockLocId,
        destination_location_id: stockLocId,
        scheduled_date: new Date().toISOString().slice(0, 10),
        items: [{ product_id: testProductId, demand_qty: 10 }]
      });

    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body.detail)).toContain('cannot be the same');
  });

  it('POST /api/v1/transfers as admin should create transfer with sequence WH/INT/0000X in Draft status', async () => {
    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        source_location_id: stockLocId,
        destination_location_id: outputLocId,
        scheduled_date: new Date().toISOString().slice(0, 10),
        notes: 'Replenishing dispatch staging area',
        items: [
          {
            product_id: testProductId,
            demand_qty: 20
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reference).toMatch(/^WH\/INT\/\d{5}$/);
    expect(res.body.data.status).toBe('Draft');

    createdTransferId = res.body.data.id;
    createdTransferRef = res.body.data.reference;
  });

  it('POST /api/v1/transfers/:id/mark-ready should mark transfer Ready', async () => {
    const res = await request(app)
      .post(`/api/v1/transfers/${createdTransferId}/mark-ready`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const detail = await request(app).get(`/api/v1/transfers/${createdTransferId}`);
    expect(detail.body.data.transfer.status).toBe('Ready');
  });

  it('POST /api/v1/transfers/:id/validate should atomically shift stock and keep total balance neutral', async () => {
    // Check initial stock
    const srcStockBefore = await db.queryOne<{ on_hand: number }>(
      'SELECT on_hand FROM stock_levels WHERE product_id = $1 AND location_id = $2',
      [testProductId, stockLocId]
    );
    const destStockBefore = await db.queryOne<{ on_hand: number }>(
      'SELECT on_hand FROM stock_levels WHERE product_id = $1 AND location_id = $2',
      [testProductId, outputLocId]
    );

    const srcBefore = Number(srcStockBefore?.on_hand) || 0;
    const destBefore = Number(destStockBefore?.on_hand) || 0;
    const totalBefore = srcBefore + destBefore;

    const res = await request(app)
      .post(`/api/v1/transfers/${createdTransferId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            product_id: testProductId,
            done_qty: 20
          }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Done');

    // Check post-transfer stock
    const srcStockAfter = await db.queryOne<{ on_hand: number }>(
      'SELECT on_hand FROM stock_levels WHERE product_id = $1 AND location_id = $2',
      [testProductId, stockLocId]
    );
    const destStockAfter = await db.queryOne<{ on_hand: number }>(
      'SELECT on_hand FROM stock_levels WHERE product_id = $1 AND location_id = $2',
      [testProductId, outputLocId]
    );

    const srcAfter = Number(srcStockAfter?.on_hand) || 0;
    const destAfter = Number(destStockAfter?.on_hand) || 0;
    const totalAfter = srcAfter + destAfter;

    expect(srcAfter).toBe(srcBefore - 20);
    expect(destAfter).toBe(destBefore + 20);
    expect(totalAfter).toBe(totalBefore); // 100% balance neutral!

    // Verify ledger entry in stock_history
    const ledgerEntry = await db.queryOne<any>(
      'SELECT * FROM stock_history WHERE reference = $1',
      [createdTransferRef]
    );
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry.operation_type).toBe('INT');
    expect(ledgerEntry.quantity).toBe(20);
    expect(ledgerEntry.status).toBe('Done');
  });
});
