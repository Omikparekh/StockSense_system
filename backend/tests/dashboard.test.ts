import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Dashboard KPIs & Operational Metrics Endpoints', () => {
  let adminToken = '';

  beforeAll(async () => {
    await db.initSchema();

    const adminRes = await request(app).post('/api/v1/auth/login').send({
      loginId: 'admin',
      password: 'AdminPassword123!'
    });
    adminToken = adminRes.body.token;
  });

  it('GET /api/v1/dashboard/kpis should require authentication', async () => {
    const res = await request(app).get('/api/v1/dashboard/kpis');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/dashboard/kpis should return full operational metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/kpis')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const kpis = res.body.data;

    // Inbound receipts metrics
    expect(kpis.receipts).toBeDefined();
    expect(typeof kpis.receipts.to_receive).toBe('number');
    expect(typeof kpis.receipts.late).toBe('number');
    expect(typeof kpis.receipts.today).toBe('number');
    expect(typeof kpis.receipts.done).toBe('number');

    // Outbound deliveries metrics
    expect(kpis.deliveries).toBeDefined();
    expect(typeof kpis.deliveries.to_deliver).toBe('number');
    expect(typeof kpis.deliveries.waiting).toBe('number');
    expect(typeof kpis.deliveries.ready).toBe('number');

    // Internal transfers metrics
    expect(kpis.transfers).toBeDefined();
    expect(typeof kpis.transfers.in_progress).toBe('number');

    // Inventory metrics
    expect(kpis.inventory).toBeDefined();
    expect(kpis.inventory.total_products).toBeGreaterThanOrEqual(1);
    expect(typeof kpis.inventory.total_units).toBe('number');
    expect(typeof kpis.inventory.low_stock_count).toBe('number');

    // Recent activities
    expect(Array.isArray(kpis.recent_operations)).toBe(true);
    expect(Array.isArray(kpis.recent_stock_moves)).toBe(true);
  });
});
