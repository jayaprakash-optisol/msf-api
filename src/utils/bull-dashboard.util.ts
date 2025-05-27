import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import express from 'express';

import { ProductsFetchQueue } from '../jobs';
import { logger } from './logger';
import { getEnv } from './config.util';

export function setupBullDashboard(): express.Express {
  // Create express app
  const app = express();
  const apiPrefix = getEnv('API_PREFIX');

  // Create Bull Dashboard
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(`${apiPrefix}/queues`);

  createBullBoard({
    queues: [new BullMQAdapter(new ProductsFetchQueue().getQueue())],
    serverAdapter,
  });

  // Use bull dashboard routes
  app.use(`${apiPrefix}/queues`, serverAdapter.getRouter());

  // Start the server
  const port = getEnv('BULL_DASHBOARD_PORT');
  app.listen(port, () => {
    logger.info(`✅ Bull Dashboard running on http://localhost:${port}${apiPrefix}/queues`);
  });

  return app;
}
