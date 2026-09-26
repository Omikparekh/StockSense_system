import { app } from './app.js';
import { env } from './config/env.js';
import { db } from './config/database.js';

async function bootstrap() {
  try {
    console.log(`[Database] Initializing ${db.engine} schema...`);
    await db.initSchema();
    console.log(`[Database] Schema initialized successfully.`);

    app.listen(env.PORT, env.HOST, () => {
      console.log(`🚀 StockSense Backend running on http://${env.HOST}:${env.PORT}`);
      console.log(`📡 Environment: ${env.NODE_ENV} | Engine: ${db.engine}`);
      console.log(`🏥 Healthcheck: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
