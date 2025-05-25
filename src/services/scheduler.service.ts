import { ProductsFetchQueue, ProductsFetchWorker } from '../jobs';
import { type ServiceResponse, ISchedulerService } from '../types';
import { _ok, handleServiceError, logger, schedulerResponse } from '../utils';

export class SchedulerService implements ISchedulerService {
  private static instance: SchedulerService;
  private readonly productsFetchQueue: ProductsFetchQueue;
  private readonly productsFetchWorker: ProductsFetchWorker;

  private constructor() {
    this.productsFetchQueue = new ProductsFetchQueue();
    this.productsFetchWorker = new ProductsFetchWorker();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Start the scheduler service
   * @returns A service response indicating success
   */
  async startScheduler(): Promise<ServiceResponse<void>> {
    try {
      logger.info('🚀 Starting scheduler service...');

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
      logger.info('🛑 Stopping scheduler service...');

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
