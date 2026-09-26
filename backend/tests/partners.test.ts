import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Partners / Suppliers Management Endpoints', () => {
  let adminToken: string;

  beforeAll(async () => {
    await db.initSchema();
    // Authenticate admin
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      loginId: 'admin',
      password: 'AdminPassword123!',
    });
    adminToken = loginRes.body.token;
  });

  it('GET /api/v1/partners should list seeded partners', async () => {
    const res = await request(app)
      .get('/api/v1/partners?type=supplier')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('type', 'supplier');
  });

  it('POST /api/v1/partners should create a new supplier', async () => {
    const newSupplier = {
      name: `Test Supplier ${Date.now()}`,
      type: 'supplier',
      contact_name: 'John Miller',
      email: 'john@testsupplier.com',
      phone: '+1 555-0199',
      address: '42 Industrial Park, Detroit, MI',
      tax_id: 'US-TAX-998877',
      payment_terms: 'Net 30',
      notes: 'Test supplier creation'
    };

    const res = await request(app)
      .post('/api/v1/partners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newSupplier);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(newSupplier.name);
    expect(res.body.data.contact_name).toBe(newSupplier.contact_name);
  });

  it('PUT /api/v1/partners/:id should update partner details', async () => {
    const createRes = await request(app)
      .post('/api/v1/partners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Supplier to Update ${Date.now()}`,
        type: 'supplier',
        payment_terms: 'Net 15'
      });
    const supplierId = createRes.body.data.id;

    const updateRes = await request(app)
      .put(`/api/v1/partners/${supplierId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        contact_name: 'Updated Contact Person',
        payment_terms: 'Net 60'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.contact_name).toBe('Updated Contact Person');
    expect(updateRes.body.data.payment_terms).toBe('Net 60');
  });

  it('DELETE /api/v1/partners/:id should remove partner', async () => {
    const createRes = await request(app)
      .post('/api/v1/partners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Supplier to Delete ${Date.now()}`,
        type: 'supplier'
      });
    const supplierId = createRes.body.data.id;

    const deleteRes = await request(app)
      .delete(`/api/v1/partners/${supplierId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});
