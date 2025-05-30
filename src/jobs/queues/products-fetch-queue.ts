import { logger, getEnv } from '../../utils';
import { parseRepeatInterval } from '../../utils/common.utils';
import { BaseQueue, BaseJobData } from '../base-queue';

export interface ProductsFetchJobData extends BaseJobData {
  mode: number;
  size: number;
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
    };

    const interval = getEnv('PRODUCT_SYNC_INTERVAL');
    const repeatOptions = parseRepeatInterval(interval);
    await this.queue.add('fetch-products', jobData, {
      repeat: repeatOptions,
    });

    logger.info('✅ Scheduled products fetch job with date-based filtering');
  }
}
