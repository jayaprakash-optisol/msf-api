import env from '../../config/env.config';
import { logger } from '../../utils';
import { BaseQueue, BaseJobData } from '../base-queue';

export interface ProductsFetchJobData extends BaseJobData {
  login: string;
  password: string;
  mode: number;
  size: number;
  filter: string;
}

export class ProductsFetchQueue extends BaseQueue {
  constructor() {
    super('products-fetch-queue');
  }

  async scheduleProductsFetch(): Promise<void> {
    const jobData: ProductsFetchJobData = {
      timestamp: new Date().toISOString(),
      login: env.API_USER_NAME,
      password: env.API_PASSWORD,
      mode: 7,
      size: 5,
      filter: 'type="MED"',
    };

    await this.addRepeatingJob('fetch-products', jobData, env.PRODUCT_SYNC_INTERVAL);

    logger.info('✅ Scheduled products fetch job to run every 1 hour');
  }
}
