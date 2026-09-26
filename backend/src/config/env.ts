import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.BACKEND_PORT || process.env.PORT || '8000', 10),
  HOST: process.env.BACKEND_HOST || '0.0.0.0',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'sqlite:///./stocksense.db',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_stocksense_jwt_signing_key_change_in_production_12345',
  JWT_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRE_MINUTES ? `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES}m` : '24h',
  OTP_PROVIDER: process.env.OTP_PROVIDER || 'console',
  VERSION: '1.0.0',
  PROJECT_NAME: 'StockSense',
};
