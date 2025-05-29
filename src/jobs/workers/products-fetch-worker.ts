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

      const { mode, size, filter } = job.data;
      const sanitizedJobData = { mode, size, filter };
      await job.log(`Job data: ${JSON.stringify(sanitizedJobData)}`);

      await job.updateProgress(30);
      await job.log('🔍 Starting products fetch from MSF API...');

      const result = await this.productsFetchService.fetchProducts({
        login,
        password,
        mode,
        size,
        filter,
        page: 1,
      });

      await job.updateProgress(50);
      await job.log(`📦 Successfully fetched ${result.data?.data?.length ?? 0} products`);
      const products = result.data?.rows;

      if (products && products.length > 0) {
        await this.productsFetchService.insertProductsData(products);
        await job.log(`💾 Successfully inserted ${products.length} products into database`);
      } else {
        await job.log('ℹ️ No products to insert');
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
