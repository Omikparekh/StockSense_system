import { Router, Request, Response } from 'express';
import { db } from '../../config/database.js';
import { env } from '../../config/env.js';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const isHealthy = await db.ping();

  if (!isHealthy) {
    res.status(503).json({
      status: 'unhealthy',
      version: env.VERSION,
      database: db.engine,
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    status: 'healthy',
    version: env.VERSION,
    database: db.engine,
    timestamp: new Date().toISOString(),
  });
});

export const healthRouter = router;
