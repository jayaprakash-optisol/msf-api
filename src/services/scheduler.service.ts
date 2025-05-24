import { ProductsFetchQueue, ProductsFetchWorker } from '../jobs';
import { type ServiceResponse } from '../types';
import { _ok, handleServiceError, logger } from '../utils';

export class SchedulerService {
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

      logger.info('✅ Scheduler service started successfully');
      return _ok(undefined, 'Scheduler service started successfully');
    } catch (error) {
      logger.error('❌ Failed to start scheduler service:', error);
      throw handleServiceError(error, 'Failed to start scheduler service');
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

      logger.info('✅ Scheduler service stopped successfully');
      return _ok(undefined, 'Scheduler service stopped successfully');
    } catch (error) {
      logger.error('❌ Failed to stop scheduler service:', error);
      throw handleServiceError(error, 'Failed to stop scheduler service');
    }
  }
}
