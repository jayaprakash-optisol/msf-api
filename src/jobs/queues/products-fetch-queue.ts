import { logger, getEnv } from '../../utils';
import { BaseQueue, BaseJobData } from '../base-queue';

export interface ProductsFetchJobData extends BaseJobData {
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
      mode: 7,
      size: 1000,
      filter: 'type="MED"',
    };

    await this.addRepeatingJob('fetch-products', jobData, getEnv('PRODUCT_SYNC_INTERVAL'));

    logger.info('✅ Scheduled products fetch job');
  }
}
