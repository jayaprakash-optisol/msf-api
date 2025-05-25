import { Job } from 'bullmq';
import { BaseWorker } from '../base-worker';
import { ProductsFetchJobData } from '../queues/products-fetch-queue';
import { ProductsFetchService } from '../../services/products-fetch.service';
import { logger } from '../../utils';
import { env } from 'process';

export class ProductsFetchWorker extends BaseWorker {
  private readonly productsFetchService: ProductsFetchService;

  constructor() {
    super('products-fetch-queue', 1); // Use concurrency of 1 for API calls
    this.productsFetchService = ProductsFetchService.getInstance();
  }

  protected async processJob(job: Job<ProductsFetchJobData>): Promise<void> {
    const now = new Date().toLocaleString();
    const startMessage = `⏱️ [${now}] Processing products fetch job ${job.id}`;
    await job.log(startMessage);

    try {
      await job.updateProgress(10);

      const login = env.API_USER_NAME;
      const password = env.API_PASSWORD;

      const { mode, size, filter } = job.data;
      const sanitizedJobData = { mode, size, filter, login: '***', password: '***' };
      await job.log(`Job data: ${JSON.stringify(sanitizedJobData)}`);

      await job.updateProgress(30);
      await job.log('🔍 Starting products fetch from MSF API...');

      const result = await this.productsFetchService.fetchProducts({
        login: login ?? '',
        password: password ?? '',
        mode,
        size,
        filter,
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
