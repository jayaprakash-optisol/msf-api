import { type ServiceResponse } from './common.interface';

/**
 * Scheduler service interface
 */
export interface ISchedulerService {
  /**
   * Start the scheduler service
   */
  startScheduler(): Promise<ServiceResponse<void>>;

  /**
   * Stop the scheduler service
   */
  stopScheduler(): Promise<ServiceResponse<void>>;
}
