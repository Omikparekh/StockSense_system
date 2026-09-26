import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Stock Move History & Adjustments Ledger Endpoints', () => {
  let adminToken = '';
  let testProductId: number;
  let testLocationId: number;

  beforeAll(async () => {
    await db.initSchema();

    const adminRes = await request(app).post('/api/v1/auth/login').send({
      loginId: 'admin',
      password: 'AdminPassword123!'
    });
    adminToken = adminRes.body.token;

    const prod = await db.queryOne<{ id: number }>('SELECT id FROM products WHERE sku = $1', ['STL-ROD-01']);
    testProductId = prod ? prod.id : 1;

    const loc = await db.queryOne<{ id: number }>("SELECT id FROM locations WHERE path = 'WH/Stock'");
    testLocationId = loc ? loc.id : 1;
  });

  it('GET /api/v1/stock-history should return 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/stock-history');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/stock-history should return paginated audit ledger', async () => {
    const res = await request(app)
      .get('/api/v1/stock-history')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
  });

  it('POST /api/v1/stock-history/adjustments should record physical count adjustment with WH/ADJ sequence', async () => {
    // Current stock query
    const beforeStock = await db.queryOne<{ on_hand: number }>(
      'SELECT on_hand FROM stock_levels WHERE product_id = $1 AND location_id = $2',
      [testProductId, testLocationId]
    );
    const prevQty = Number(beforeStock?.on_hand) || 0;
    const targetQty = prevQty + 12;

    const res = await request(app)
      .post('/api/v1/stock-history/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        product_id: testProductId,
        location_id: testLocationId,
        counted_quantity: targetQty,
        reason: 'Annual physical inventory audit recount'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reference).toMatch(/^WH\/ADJ\/\d{5}$/);
    expect(res.body.data.delta).toBe(12);
    expect(res.body.data.countedQuantity).toBe(targetQty);

    // Verify stock_levels updated
    const afterStock = await db.queryOne<{ on_hand: number }>(
      'SELECT on_hand FROM stock_levels WHERE product_id = $1 AND location_id = $2',
      [testProductId, testLocationId]
    );
    expect(Number(afterStock?.on_hand)).toBe(targetQty);

    // Verify stock_history contains the WH/ADJ record
    const historyRecord = await db.queryOne<any>(
      'SELECT * FROM stock_history WHERE reference = $1',
      [res.body.data.reference]
    );
    expect(historyRecord).toBeDefined();
    expect(historyRecord.operation_type).toBe('ADJ');
    expect(Number(historyRecord.quantity)).toBe(12);
    expect(historyRecord.to_location).toBe('WH/Stock');
  });

  it('GET /api/v1/stock-history/adjustments should filter to only ADJ records', async () => {
    const res = await request(app)
      .get('/api/v1/stock-history/adjustments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    for (const item of res.body.data) {
      expect(item.operation_type).toBe('ADJ');
      expect(item.reference).toMatch(/^WH\/ADJ\/\d{5}$/);
    }
  });

  it('GET /api/v1/stock-history/export/csv should return CSV file stream with headers', async () => {
    const res = await request(app)
      .get('/api/v1/stock-history/export/csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Reference,Operation Type');
    expect(res.text).toContain('WH/ADJ');
  });
});
