import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { apiV1Router } from './api/v1/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Information Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: `Welcome to the ${env.PROJECT_NAME} API`,
    version: env.VERSION,
    docs: '/api/v1/health',
    health: '/api/v1/health',
  });
});

// API Routes
app.use('/api/v1', apiV1Router);

// Global Error Handler
app.use(errorHandler);
