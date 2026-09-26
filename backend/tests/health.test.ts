import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Health and System Endpoints', () => {
  beforeAll(async () => {
    await db.initSchema();
  });

  it('GET / should return 200 and welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('StockSense');
    expect(res.body.version).toBe('1.0.0');
  });

  it('GET /api/v1/health should return 200 and healthy database status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.database).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });
});
