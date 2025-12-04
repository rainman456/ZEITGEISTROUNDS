import express from 'express';
//import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './db/client';
import { redis } from './cache/redis';
//import { solana } from './solana/connection';
import { startupChecks } from './startup';
//import { JobManager } from './jobs';

const app = express();
//const jobManager = new JobManager();

// Middleware
// app.use(cors({
//   origin: config.server.corsOrigin,
//   credentials: true,
// }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  const redisHealthy = await redis.healthCheck();
  //const solanaHealthy = await solana.healthCheck();

  const healthy = dbHealthy && redisHealthy//&& solanaHealthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'up' : 'down',
      redis: redisHealthy ? 'up' : 'down',
//solana: solanaHealthy ? 'up' : 'down',
    },
  });
});

// API routes
import { apiRouter } from './routes';

app.get('/api/v1/status', (req, res) => {
  res.json({
    message: 'Zeitgeist Backend API',
    version: '1.0.0',
    network: config.solana.network,
  });
});

// Mount API routes
app.use('/api', apiRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(config.server.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
});

// Startup sequence
async function start() {
  try {
    logger.info('Starting Zeitgeist Backend...');

    // Run startup checks
    await startupChecks();

    // Start server
    app.listen(config.server.port, () => {
      logger.info(`Server running on port ${config.server.port}`, {
        nodeEnv: config.server.nodeEnv,
        network: config.solana.network,
      });
      
      // Start background jobs
      //jobManager.startAll();
      logger.info('Background jobs initialized');
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  //jobManager.stopAll();
  await db.close();
  await redis.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
 // jobManager.stopAll();
  await db.close();
  await redis.close();
  process.exit(0);
});

start();
