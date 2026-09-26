import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Warehouses & Storage Locations Endpoints', () => {
  let adminToken = '';
  let createdWarehouseId: number;
  let customLocationId: number;

  beforeAll(async () => {
    await db.initSchema();

    // Clean up test warehouse if exists
    const testWh = await db.queryOne<any>("SELECT id FROM warehouses WHERE short_code = 'NLH'");
    if (testWh) {
      await db.execute('DELETE FROM locations WHERE warehouse_id = $1', [testWh.id]);
      await db.execute('DELETE FROM warehouses WHERE id = $1', [testWh.id]);
    }

    const adminRes = await request(app).post('/api/v1/auth/login').send({
      loginId: 'admin',
      password: 'AdminPassword123!'
    });
    adminToken = adminRes.body.token;
  });

  it('GET /api/v1/warehouses should return seeded warehouse WH with default locations', async () => {
    const res = await request(app).get('/api/v1/warehouses');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const defaultWh = res.body.data.find((w: any) => w.short_code === 'WH');
    expect(defaultWh).toBeDefined();
    expect(defaultWh.locations.length).toBeGreaterThanOrEqual(2);
    expect(defaultWh.locations.some((l: any) => l.path === 'WH/Stock')).toBe(true);
    expect(defaultWh.locations.some((l: any) => l.path === 'WH/Output')).toBe(true);
  });

  it('POST /api/v1/warehouses as admin should create warehouse and auto-provision Stock & Output bins', async () => {
    const res = await request(app)
      .post('/api/v1/warehouses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'North Logistics Hub',
        short_code: 'NLH',
        address: 'Sector 8, Northern Cargo Port'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.short_code).toBe('NLH');

    createdWarehouseId = res.body.data.id;

    // Verify auto-provisioned bins
    const whList = await request(app).get('/api/v1/warehouses');
    const nlh = whList.body.data.find((w: any) => w.id === createdWarehouseId);
    expect(nlh).toBeDefined();
    expect(nlh.locations.length).toBe(2);
    expect(nlh.locations.some((l: any) => l.path === 'NLH/Stock')).toBe(true);
    expect(nlh.locations.some((l: any) => l.path === 'NLH/Output')).toBe(true);
  });

  it('POST /api/v1/warehouses with duplicate short code should fail with 409', async () => {
    const res = await request(app)
      .post('/api/v1/warehouses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Hub',
        short_code: 'NLH'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('POST /api/v1/warehouses/locations should create custom compound location', async () => {
    const res = await request(app)
      .post('/api/v1/warehouses/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        warehouse_id: createdWarehouseId,
        name: 'Quality Inspection Bay',
        short_code: 'Quality'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.path).toBe('NLH/Quality');

    customLocationId = res.body.data.id;
  });

  it('POST /api/v1/warehouses/locations with duplicate path should fail with 409', async () => {
    const res = await request(app)
      .post('/api/v1/warehouses/locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        warehouse_id: createdWarehouseId,
        name: 'Duplicate Bay',
        short_code: 'Quality'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('GET /api/v1/warehouses/locations?warehouse_id=X should filter locations', async () => {
    const res = await request(app).get(`/api/v1/warehouses/locations?warehouse_id=${createdWarehouseId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3); // NLH/Stock, NLH/Output, NLH/Quality
    expect(res.body.data.every((l: any) => l.warehouse_id === createdWarehouseId)).toBe(true);
  });

  it('DELETE /api/v1/warehouses/locations/:id should delete empty location', async () => {
    const res = await request(app)
      .delete(`/api/v1/warehouses/locations/${customLocationId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('deleted successfully');
  });

  it('GET /api/v1/warehouses/:id/inventory should return stocked products with photos, unit costs, and valuations', async () => {
    const res = await request(app).get('/api/v1/warehouses/1/inventory');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      const item = res.body.data[0];
      expect(item).toHaveProperty('productId');
      expect(item).toHaveProperty('productName');
      expect(item).toHaveProperty('sku');
      expect(item).toHaveProperty('unitCost');
      expect(typeof item.unitCost).toBe('number');
      expect(item).toHaveProperty('isApproxCost');
      expect(typeof item.isApproxCost).toBe('boolean');
      expect(item).toHaveProperty('totalValuation');
      expect(item).toHaveProperty('locationPath');
      expect(item).toHaveProperty('onHand');
      expect(item).toHaveProperty('imageUrl');
      expect(item).toHaveProperty('imageUrl2');
      expect(item.totalValuation).toBe(Math.round(item.onHand * item.unitCost * 100) / 100);
    }
  });
});
