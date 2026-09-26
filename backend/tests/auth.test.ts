import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/database.js';

describe('Authentication & RBAC Endpoints', () => {
  beforeAll(async () => {
    await db.initSchema();
    await db.execute("DELETE FROM users WHERE login_id = 'warehouse_joe'");
    await db.execute("DELETE FROM otps WHERE email = 'joe@stocksense.io'");
  });

  const testUser = {
    loginId: 'warehouse_joe',
    email: 'joe@stocksense.io',
    name: 'Joe Miller',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    role: 'warehouse_staff',
  };

  let receivedOtp: string = '';
  let authToken: string = '';

  it('POST /auth/login with seeded admin credentials should succeed', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      loginId: 'admin',
      password: 'AdminPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.loginId).toBe('admin');
    expect(res.body.user.role).toBe('admin');
  });

  it('POST /auth/login with wrong password should fail with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      loginId: 'admin',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid credentials');
  });

  it('POST /auth/signup should register user and dispatch OTP', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.requiresOtp).toBe(true);
    expect(res.body.email).toBe(testUser.email);
    expect(res.body.devOtpCode).toBeDefined();

    receivedOtp = res.body.devOtpCode;
  });

  it('POST /auth/signup with duplicate loginId should fail with 409', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already taken');
  });

  it('POST /auth/verify-otp with incorrect OTP should fail with 400', async () => {
    const res = await request(app).post('/api/v1/auth/verify-otp').send({
      email: testUser.email,
      otpCode: '000000',
      purpose: 'signup',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid or expired OTP');
  });

  it('POST /auth/verify-otp with correct OTP should activate user and issue JWT', async () => {
    const res = await request(app).post('/api/v1/auth/verify-otp').send({
      email: testUser.email,
      otpCode: receivedOtp,
      purpose: 'signup',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.loginId).toBe(testUser.loginId);

    authToken = res.body.token;
  });

  it('GET /auth/me with valid Bearer token should return profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.role).toBe(testUser.role);
    expect(res.body.user.isActive).toBe(true);
  });

  it('GET /auth/me without token should fail with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Missing Bearer token');
  });

  it('POST /auth/forgot-password should generate reset OTP', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({
      emailOrLoginId: testUser.email,
    });

    expect(res.status).toBe(200);
    expect(res.body.devOtpCode).toBeDefined();

    const resetOtp = res.body.devOtpCode;

    // Reset password with the OTP
    const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
      email: testUser.email,
      otpCode: resetOtp,
      newPassword: 'BrandNewPassword999!',
      confirmPassword: 'BrandNewPassword999!',
    });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toContain('Password reset successfully');

    // Verify login with new password succeeds
    const newLoginRes = await request(app).post('/api/v1/auth/login').send({
      loginId: testUser.loginId,
      password: 'BrandNewPassword999!',
    });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.token).toBeDefined();
  });
});
