import { Job } from 'bullmq';
import { BaseWorker } from '../base-worker';
import { ProductsFetchJobData } from '../queues/products-fetch-queue';
import { ProductsFetchService } from '../../services/products-fetch.service';
import { logger } from '../../utils';

export class ProductsFetchWorker extends BaseWorker {
  private readonly productsFetchService: ProductsFetchService;

  constructor() {
    super('products-fetch-queue', 1); // Use concurrency of 1 for API calls
    this.productsFetchService = ProductsFetchService.getInstance();
  }

  protected async processJob(job: Job<ProductsFetchJobData>): Promise<void> {
    const now = new Date().toLocaleString();
    const startMessage = `⏱️ [${now}] Processing products fetch job ${job.id}`;
    console.log(startMessage);
    await job.log(startMessage);

    try {
      await job.updateProgress(10);
      await job.log(`Job data: ${JSON.stringify(job.data)}`);

      const { login, password, mode, size, filter } = job.data;

      await job.updateProgress(30);
      await job.log('🔍 Starting products fetch from MSF API...');

      const result = await this.productsFetchService.fetchProducts({
        login,
        password,
        mode,
        size,
        filter,
      });

      await job.updateProgress(80);
      await job.log(`📦 Successfully fetched ${result.data?.data?.length ?? 0} products`);

      // Here you can add additional processing logic:
      // - Save to database
      // - Transform data
      // - Send notifications, etc.

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
