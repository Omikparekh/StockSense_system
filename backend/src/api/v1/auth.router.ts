import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { env } from '../../config/env.js';
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
} from '../../core/security.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router();

// Validation Schemas
const SignupSchema = z
  .object({
    loginId: z
      .string()
      .min(3, 'Login ID must be at least 3 characters')
      .max(30, 'Login ID must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Login ID can only contain letters, numbers, underscores, and dashes'),
    email: z.string().email('Invalid email address format'),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    role: z.enum(['admin', 'inventory_manager', 'warehouse_staff']).optional().default('warehouse_staff'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ['confirmPassword'],
  });

const LoginSchema = z.object({
  loginId: z.string().min(1, 'Login ID or Email is required'),
  password: z.string().min(1, 'Password is required'),
});

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otpCode: z.string().length(6, 'OTP must be exactly 6 digits'),
  purpose: z.enum(['signup', 'password_reset']),
});

const ForgotPasswordSchema = z.object({
  emailOrLoginId: z.string().min(1, 'Email or Login ID is required'),
});

const ResetPasswordSchema = z
  .object({
    email: z.string().email(),
    otpCode: z.string().length(6, 'OTP must be exactly 6 digits'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ['confirmPassword'],
  });

// Helper to generate 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/v1/auth/signup
 */
router.post(
  '/signup',
  asyncHandler(async (req: Request, res: Response) => {
    const body = SignupSchema.parse(req.body);

    // Check unique constraints
    const existingLogin = await db.queryOne('SELECT id FROM users WHERE login_id = $1', [body.loginId]);
    if (existingLogin) {
      throw new AppError(`Login ID '${body.loginId}' is already taken. Please choose another.`, 409);
    }

    const existingEmail = await db.queryOne('SELECT id FROM users WHERE email = $1', [body.email]);
    if (existingEmail) {
      throw new AppError(`Email '${body.email}' is already registered. Please sign in instead.`, 409);
    }

    const pwdHash = await hashPassword(body.password);
    const displayName = body.name || body.loginId;

    // Insert user (inactive until OTP verified)
    await db.execute(
      `INSERT INTO users (login_id, email, name, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [body.loginId, body.email, displayName, pwdHash, body.role, 0]
    );

    // Generate OTP
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.execute(
      `INSERT INTO otps (email, otp_code, purpose, expires_at, used)
       VALUES ($1, $2, $3, $4, $5)`,
      [body.email, otpCode, 'signup', expiresAt, 0]
    );

    console.log(`\n==================================================`);
    console.log(`📧 [EMAIL SIMULATION] Signup OTP Verification`);
    console.log(`To: ${body.email}`);
    console.log(`Your 6-digit StockSense verification code is: ${otpCode}`);
    console.log(`Expires in: 10 minutes`);
    console.log(`==================================================\n`);

    res.status(201).json({
      message: 'Registration initiated. Please verify the 6-digit OTP sent to your email.',
      email: body.email,
      requiresOtp: true,
      devOtpCode: (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') ? otpCode : undefined,
    });
  })
);

/**
 * POST /api/v1/auth/verify-otp
 */
router.post(
  '/verify-otp',
  asyncHandler(async (req: Request, res: Response) => {
    const body = VerifyOtpSchema.parse(req.body);

    const otpRecord = await db.queryOne(
      `SELECT * FROM otps 
       WHERE email = $1 AND otp_code = $2 AND purpose = $3 AND used = 0
       ORDER BY id DESC LIMIT 1`,
      [body.email, body.otpCode, body.purpose]
    );

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP verification code.', 400);
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    if (now > expiresAt) {
      throw new AppError('OTP has expired. Please request a new code.', 400);
    }

    // Mark OTP as used
    await db.execute('UPDATE otps SET used = 1 WHERE id = $1', [otpRecord.id]);

    if (body.purpose === 'signup') {
      // Activate user
      await db.execute('UPDATE users SET is_active = 1 WHERE email = $1', [body.email]);
    }

    const user = await db.queryOne(
      'SELECT id, login_id, email, name, role, is_active FROM users WHERE email = $1',
      [body.email]
    );

    if (!user) {
      throw new AppError('User profile not found.', 404);
    }

    const token = createAccessToken({
      id: user.id,
      loginId: user.login_id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.json({
      message: 'OTP verified successfully.',
      token,
      user: {
        id: user.id,
        loginId: user.login_id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  })
);

/**
 * POST /api/v1/auth/login
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const body = LoginSchema.parse(req.body);

    const user = await db.queryOne(
      `SELECT * FROM users WHERE login_id = $1 OR email = $1 LIMIT 1`,
      [body.loginId]
    );

    if (!user) {
      throw new AppError('Invalid credentials. Please verify your Login ID and password.', 401);
    }

    const isValidPassword = await verifyPassword(body.password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials. Please verify your Login ID and password.', 401);
    }

    if (!user.is_active) {
      throw new AppError('Account is pending verification. Please verify your email OTP.', 403);
    }

    const token = createAccessToken({
      id: user.id,
      loginId: user.login_id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        loginId: user.login_id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  })
);

/**
 * POST /api/v1/auth/forgot-password
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req: Request, res: Response) => {
    const body = ForgotPasswordSchema.parse(req.body);

    const user = await db.queryOne(
      `SELECT id, email, login_id FROM users WHERE login_id = $1 OR email = $1 LIMIT 1`,
      [body.emailOrLoginId]
    );

    if (!user) {
      res.json({
        message: 'If the account exists, a 6-digit reset code has been sent to your email.',
      });
      return;
    }

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.execute(
      `INSERT INTO otps (email, otp_code, purpose, expires_at, used)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.email, otpCode, 'password_reset', expiresAt, 0]
    );

    console.log(`\n==================================================`);
    console.log(`🔑 [EMAIL SIMULATION] Password Reset OTP Code`);
    console.log(`To: ${user.email} (User: ${user.login_id})`);
    console.log(`Your 6-digit StockSense reset code is: ${otpCode}`);
    console.log(`Expires in: 10 minutes`);
    console.log(`==================================================\n`);

    res.json({
      message: 'Password reset code sent to your registered email.',
      email: user.email,
      devOtpCode: (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') ? otpCode : undefined,
    });
  })
);

/**
 * POST /api/v1/auth/reset-password
 */
router.post(
  '/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const body = ResetPasswordSchema.parse(req.body);

    const otpRecord = await db.queryOne(
      `SELECT * FROM otps 
       WHERE email = $1 AND otp_code = $2 AND purpose = 'password_reset' AND used = 0
       ORDER BY id DESC LIMIT 1`,
      [body.email, body.otpCode]
    );

    if (!otpRecord) {
      throw new AppError('Invalid or expired password reset code.', 400);
    }

    const now = new Date();
    if (now > new Date(otpRecord.expires_at)) {
      throw new AppError('Reset code has expired. Please request a new one.', 400);
    }

    // Update password and mark OTP used
    const newHash = await hashPassword(body.newPassword);
    await db.execute('UPDATE users SET password_hash = $1 WHERE email = $2', [newHash, body.email]);
    await db.execute('UPDATE otps SET used = 1 WHERE id = $1', [otpRecord.id]);

    res.json({
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  })
);

/**
 * GET /api/v1/auth/me
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await db.queryOne(
      'SELECT id, login_id, email, name, role, is_active, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (!user) {
      throw new AppError('User profile not found.', 404);
    }

    res.json({
      user: {
        id: user.id,
        loginId: user.login_id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: Boolean(user.is_active),
        createdAt: user.created_at,
      },
    });
  })
);

export const authRouter = router;
