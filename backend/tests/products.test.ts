import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Products & Stock Reconciliation Endpoints', () => {
  let adminToken = '';
  let staffToken = '';
  let createdProductId: number;

  beforeAll(async () => {
    await db.initSchema();

    // Clean up any test product residues
    await db.execute("DELETE FROM stock_history WHERE product_id IN (SELECT id FROM products WHERE sku = 'CPR-WIR-08')");
    await db.execute("DELETE FROM stock_levels WHERE product_id IN (SELECT id FROM products WHERE sku = 'CPR-WIR-08')");
    await db.execute("DELETE FROM products WHERE sku = 'CPR-WIR-08'");

    // Login as seeded admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      loginId: 'admin',
      password: 'AdminPassword123!'
    });
    adminToken = adminRes.body.token;

    // Create and verify a staff user for role tests
    await db.execute("DELETE FROM users WHERE login_id = 'test_staff'");
    await db.execute("DELETE FROM otps WHERE email = 'staff@stocksense.io'");

    const signupRes = await request(app).post('/api/v1/auth/signup').send({
      loginId: 'test_staff',
      email: 'staff@stocksense.io',
      name: 'Test Staff',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'warehouse_staff'
    });

    const otp = signupRes.body.devOtpCode;
    const verifyRes = await request(app).post('/api/v1/auth/verify-otp').send({
      email: 'staff@stocksense.io',
      otpCode: otp,
      purpose: 'signup'
    });
    staffToken = verifyRes.body.token;
  });

  it('GET /api/v1/products should return catalog with calculated stock balances', async () => {
    const res = await request(app).get('/api/v1/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThanOrEqual(6);
    expect(res.body.data.categories).toContain('Raw Materials');

    const steelRod = res.body.data.products.find((p: any) => p.sku === 'STL-ROD-01');
    expect(steelRod).toBeDefined();
    expect(steelRod.on_hand).toBe(50);
    expect(steelRod.stock_status).toBe('in_stock');
  });

  it('GET /api/v1/products?search=steel should filter by search term', async () => {
    const res = await request(app).get('/api/v1/products?search=steel');

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(1);
    expect(res.body.data.products[0].sku).toBe('STL-ROD-01');
  });

  it('GET /api/v1/products?category=Hardware should filter by category', async () => {
    const res = await request(app).get('/api/v1/products?category=Hardware');

    expect(res.status).toBe(200);
    expect(res.body.data.products.every((p: any) => p.category === 'Hardware')).toBe(true);
  });

  it('GET /api/v1/products?status=out_of_stock should filter out-of-stock items', async () => {
    const res = await request(app).get('/api/v1/products?status=out_of_stock');

    expect(res.status).toBe(200);
    const motor = res.body.data.products.find((p: any) => p.sku === 'MTR-ELC-06');
    expect(motor).toBeDefined();
    expect(motor.on_hand).toBe(0);
    expect(motor.stock_status).toBe('out_of_stock');
  });

  it('GET /api/v1/products/:id should return single product with location breakdown', async () => {
    const listRes = await request(app).get('/api/v1/products');
    const firstProduct = listRes.body.data.products[0];

    const res = await request(app).get(`/api/v1/products/${firstProduct.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product.id).toBe(firstProduct.id);
    expect(res.body.data.locations).toBeDefined();
    expect(Array.isArray(res.body.data.locations)).toBe(true);
    expect(res.body.data.recentMovements).toBeDefined();
  });

  it('POST /api/v1/products without token should fail with 401', async () => {
    const res = await request(app).post('/api/v1/products').send({
      name: 'Copper Wire Spool',
      sku: 'CPR-WIR-08',
      category: 'Electrical',
      uom: 'Meters'
    });

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/products as warehouse_staff should fail with 403', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Copper Wire Spool',
        sku: 'CPR-WIR-08',
        category: 'Electrical',
        uom: 'Meters'
      });

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/products as admin should succeed and seed initial stock', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Copper Wire Spool',
        sku: 'CPR-WIR-08',
        category: 'Electrical',
        uom: 'Meters',
        per_unit_weight: 12.5,
        reorder_level: 25,
        initial_stock: 150
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.sku).toBe('CPR-WIR-08');

    createdProductId = res.body.data.id;

    // Verify stock was created
    const detailRes = await request(app).get(`/api/v1/products/${createdProductId}`);
    expect(detailRes.body.data.product.on_hand).toBe(150);
  });

  it('POST /api/v1/products with duplicate SKU should fail with 409', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate Item',
        sku: 'CPR-WIR-08',
        category: 'Electrical',
        uom: 'Meters'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('PUT /api/v1/products/:id should update metadata', async () => {
    const res = await request(app)
      .put(`/api/v1/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Heavy Duty Copper Wire Spool',
        reorder_level: 30
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Heavy Duty Copper Wire Spool');
    expect(res.body.data.reorder_level).toBe(30);
  });

  it('POST /api/v1/products/:id/adjust (In-Table Quick Reconciliation) should log sequence WH/ADJ/00001', async () => {
    // Current stock is 150. Counted is 165 (+15 surplus)
    const res = await request(app)
      .post(`/api/v1/products/${createdProductId}/adjust`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        counted_quantity: 165,
        reason: 'Monthly physical warehouse audit recount'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reference).toMatch(/^WH\/ADJ\/\d{5}$/);
    expect(res.body.data.previousQuantity).toBe(150);
    expect(res.body.data.countedQuantity).toBe(165);
    expect(res.body.data.delta).toBe(15);

    // Verify updated stock
    const detailRes = await request(app).get(`/api/v1/products/${createdProductId}`);
    expect(detailRes.body.data.product.on_hand).toBe(165);

    // Verify audit entry in stock history
    const historyRes = await db.queryOne<any>(
      'SELECT * FROM stock_history WHERE reference = $1',
      [res.body.data.reference]
    );
    expect(historyRes).toBeDefined();
    expect(historyRes.operation_type).toBe('ADJ');
    expect(historyRes.quantity).toBe(15);
  });

  it('DELETE /api/v1/products/:id with stock on hand should be rejected with 400', async () => {
    const res = await request(app)
      .delete(`/api/v1/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('stock on hand');
  });
});
