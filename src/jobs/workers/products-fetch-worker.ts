import { Job } from 'bullmq';
import { BaseWorker } from '../base-worker';
import { ProductsFetchJobData } from '../queues';
import { ProductsFetchService } from '../../services';
import { logger } from '../../utils';
import { env } from '../../config/env.config';

export class ProductsFetchWorker extends BaseWorker {
  private readonly productsFetchService: ProductsFetchService;
  private readonly config = env.getConfig();

  constructor() {
    super('products-fetch-queue', 1); // Use concurrency of 1 for API calls
    this.productsFetchService = ProductsFetchService.getInstance();
  }

  // Helper method to get API credentials with nullish coalescing
  // This makes it easier to test the nullish coalescing behavior
  protected getApiCredentials() {
    const login = this.config.API_USER_NAME;
    const password = this.config.API_PASSWORD;
    return {
      login: login ?? '',
      password: password ?? '',
    };
  }

  protected async processJob(job: Job<ProductsFetchJobData>): Promise<void> {
    const now = new Date().toLocaleString();
    const startMessage = `⏱️ [${now}] Processing products fetch job ${job.id}`;
    await job.log(startMessage);

    try {
      await job.updateProgress(10);

      const { login, password } = this.getApiCredentials();
      const { mode, size } = job.data;

      // Log current sync info
      const lastUpdateDate = await this.productsFetchService.getLastUpdateDate();
      if (lastUpdateDate) {
        await job.log(`📅 Last sync date: ${lastUpdateDate.toISOString()}`);
      } else {
        await job.log('📅 No previous sync date found, will fetch recent products');
      }

      await job.updateProgress(30);
      await job.log('🔍 Starting products fetch from MSF API with date filtering...');

      // Use the new date-filtered fetch method
      const result = await this.productsFetchService.fetchProductsWithDateFilter(
        { login, password },
        {
          mode: mode ?? 7,
          size: size ?? 1000,
          productType: 'MED', // From the original filter
        },
      );

      await job.updateProgress(50);
      const productCount = result.data?.rows?.length ?? 0;

      const products = result.data?.rows;

      if (products && products.length > 0) {
        const insertedCount = await this.productsFetchService.insertProductsData(products);
        await job.log(`💾 Successfully inserted/updated ${insertedCount} products in database`);
        await job.log(`✅ Product sync completed - processed ${productCount} products`);
      } else {
        await job.log('ℹ️ No new or updated products found since last sync');
      }

      await job.updateProgress(100);
      await job.log('✅ Products fetch job completed successfully');
    } catch (error) {
      const errorMessage = `❌ [${new Date().toLocaleString()}] Error processing products fetch job: ${error}`;
      logger.error(errorMessage);
      await job.log(errorMessage);
      throw error;
    }
  }
}
