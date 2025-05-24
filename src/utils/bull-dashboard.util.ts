import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import express from 'express';

import env from '../config/env.config';
import { ProductsFetchQueue } from '../jobs';
import { logger } from './logger';

export function setupBullDashboard(): express.Express {
  // Create express app
  const app = express();

  // Create Bull Dashboard
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(`${env.API_PREFIX}/queues`);

  createBullBoard({
    queues: [new BullMQAdapter(new ProductsFetchQueue().getQueue())],
    serverAdapter,
  });

  // Use bull dashboard routes
  app.use(`${env.API_PREFIX}/queues`, serverAdapter.getRouter());

  // Start the server
  const port = env.BULL_DASHBOARD_PORT;
  app.listen(port, () => {
    logger.info(`✅ Bull Dashboard running on http://localhost:${port}${env.API_PREFIX}/queues`);
  });

  return app;
}
