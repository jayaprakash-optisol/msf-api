import { ISchedulerService, type ServiceResponse } from '../types';
import { _ok, handleServiceError, logger, schedulerResponse } from '../utils';
import { ProductsFetchQueue, ProductsFetchWorker } from '../jobs';

export class SchedulerService implements ISchedulerService {
  private static instance: SchedulerService;
  private readonly productsFetchQueue: ProductsFetchQueue;
  private readonly productsFetchWorker: ProductsFetchWorker;

  private constructor(
    productsFetchQueue?: ProductsFetchQueue,
    productsFetchWorker?: ProductsFetchWorker,
  ) {
    this.productsFetchQueue = productsFetchQueue ?? new ProductsFetchQueue();
    this.productsFetchWorker = productsFetchWorker ?? new ProductsFetchWorker();
  }

  /**
   * Get singleton instance
   * @param productsFetchQueue Optional ProductsFetchQueue instance for testing
   * @param productsFetchWorker Optional ProductsFetchWorker instance for testing
   */
  public static getInstance(
    productsFetchQueue?: ProductsFetchQueue,
    productsFetchWorker?: ProductsFetchWorker,
  ): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService(productsFetchQueue, productsFetchWorker);
    }
    return SchedulerService.instance;
  }

  /**
   * Start the scheduler service
   * @returns A service response indicating success
   */
  async startScheduler(): Promise<ServiceResponse<void>> {
    try {
      // Schedule the products fetch job
      await this.productsFetchQueue.scheduleProductsFetch();

      logger.info(`✅ ${schedulerResponse.success.startSuccess}`);
      return _ok(undefined, schedulerResponse.success.startSuccess);
    } catch (error) {
      logger.error('❌ Failed to start scheduler service:', error);
      throw handleServiceError(error, schedulerResponse.errors.startFailed);
    }
  }

  /**
   * Stop the scheduler service
   * @returns A service response indicating success
   */
  async stopScheduler(): Promise<ServiceResponse<void>> {
    try {
      await this.productsFetchWorker.close();
      await this.productsFetchQueue.close();

      logger.info(schedulerResponse.success.stopSuccess);
      return _ok(undefined, schedulerResponse.success.stopSuccess);
    } catch (error) {
      logger.error('❌ Failed to stop scheduler service:', error);
      throw handleServiceError(error, schedulerResponse.errors.stopFailed);
    }
  }
}
