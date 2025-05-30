import http from 'http';
import path from 'path';

import compression from 'compression';
import cors from 'cors';
import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import morgan from 'morgan';

import { closePool, initDatabaseConnection } from './config/database.config';
import { env } from './config/env.config';
import { initRedisClient } from './config/redis.config';
import swaggerSpec from './docs/swagger';
import { SchedulerService } from './services';
import {
  cacheControl,
  contentSecurityPolicy,
  corsOptions,
  errorHandler,
  frameGuard,
  hsts,
  noSniff,
  notFoundHandler,
  xssFilter,
} from './middleware';
import routes from './routes';
import { closeRedisConnections, logger, stream, updateLoggerConfig } from './utils';
import { setupBullDashboard } from './utils/bull-dashboard.util';

// Create Express application
export const app: Application = express();

// Global scheduler service instance for cleanup
let schedulerService: SchedulerService;

export async function configureApp(): Promise<void> {
  // Initialize environment variables from Azure KeyVault if enabled
  await env.initialize();
  const config = env.getConfig();

  // Update logger with loaded environment config
  updateLoggerConfig(config.LOG_LEVEL, config.LOG_FILE_PATH);

  // Initialize database with loaded environment variables
  await initDatabaseConnection();

  // Initialize Redis client
  initRedisClient();
  setupBullDashboard();

  // BullMQ will connect to Redis lazily when needed

  // Initialize and start scheduler service
  schedulerService = SchedulerService.getInstance();
  await schedulerService.startScheduler();
  logger.info('✅ Scheduler service initialized and started');

  // Security middleware
  app.use(helmet());

  // CORS with custom options
  app.use(cors(corsOptions));

  // Additional security headers
  app.use(contentSecurityPolicy);
  app.use(noSniff);
  app.use(xssFilter);
  app.use(frameGuard);
  app.use(hsts);
  app.use(cacheControl);

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Compression
  app.use(compression());

  // Logging
  if (config.NODE_ENV === 'production') {
    app.use(morgan('combined', { stream }));
  } else {
    // Simple, clean log format for development
    app.use(
      morgan(':method :url :status :response-time[0]ms', {
        stream,
        skip: req => req.url === '/health',
      }),
    );
  }

  // Configure web API routes with versioning
  app.use(config.API_PREFIX, routes);

  // Health check endpoint (no rate limiting)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK' });
  });

  // Swagger documentation (no rate limiting)
  app.use(`${config.API_PREFIX}/api-docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve static files from the correct public directory
  app.use(express.static(path.resolve(__dirname, '../public')));

  // Serve .well-known directory with correct content type
  app.use(
    '/.well-known',
    express.static(path.resolve(__dirname, '../.well-known'), {
      setHeaders: (res, path) => {
        if (path.endsWith('apple-app-site-association')) {
          res.setHeader('Content-Type', 'application/json');
        }
      },
    }),
  );

  // Expose Swagger JSON (no rate limiting)
  app.get(`/api-docs.json`, (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);
}

async function startServer(): Promise<void> {
  try {
    await configureApp();
    const config = env.getConfig();
    const server = http.createServer(app);

    server.listen(config.PORT, () => {
      logger.info(`✅ Server is running on port ${config.PORT}`);
      logger.info(
        `✅ API Documentation available at http://localhost:${config.PORT}${config.API_PREFIX}/api-docs`,
      );
    });

    // Handle a graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Shutting down gracefully...');

      // Stop scheduler service
      if (schedulerService) {
        await schedulerService.stopScheduler();
        logger.info('✅ Scheduler service stopped');
      }

      await closePool();
      await closeRedisConnections();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export startServer function for programmatic usage
export { startServer };

// Start server only if this file is run directly (not when imported as a module)
if (require.main === module) {
  startServer();
}
