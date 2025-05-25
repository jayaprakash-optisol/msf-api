import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { SchedulerService } from '../../src/services/scheduler.service';
import { ProductsFetchQueue } from '../../src/jobs/queues/products-fetch-queue';
import { ProductsFetchWorker } from '../../src/jobs/workers/products-fetch-worker';
import { InternalServerError } from '../../src/utils/error.util';

// Mock the queue and worker classes
vi.mock('../../src/jobs/queues/products-fetch-queue');
vi.mock('../../src/jobs/workers/products-fetch-worker');

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;
  let mockProductsFetchQueue: ProductsFetchQueue;
  let mockProductsFetchWorker: ProductsFetchWorker;

  beforeEach(() => {
    vi.resetAllMocks();

    // Reset singleton
    // @ts-ignore
    SchedulerService.instance = undefined;

    // Create mock instances
    mockProductsFetchQueue = {
      scheduleProductsFetch: vi.fn(),
      close: vi.fn(),
    } as any;

    mockProductsFetchWorker = {
      close: vi.fn(),
    } as any;

    // Mock the constructors
    vi.mocked(ProductsFetchQueue).mockImplementation(() => mockProductsFetchQueue);
    vi.mocked(ProductsFetchWorker).mockImplementation(() => mockProductsFetchWorker);

    schedulerService = SchedulerService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SchedulerService.getInstance();
      const instance2 = SchedulerService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(SchedulerService);
    });

    it('should accept optional queue and worker parameters', () => {
      // Reset singleton
      // @ts-ignore
      SchedulerService.instance = undefined;

      const customQueue = {} as ProductsFetchQueue;
      const customWorker = {} as ProductsFetchWorker;

      const instance = SchedulerService.getInstance(customQueue, customWorker);

      expect(instance).toBeInstanceOf(SchedulerService);
    });

    it('should use default queue and worker when not provided', () => {
      // Reset singleton
      // @ts-ignore
      SchedulerService.instance = undefined;

      const instance = SchedulerService.getInstance();

      expect(instance).toBeInstanceOf(SchedulerService);
      expect(ProductsFetchQueue).toHaveBeenCalled();
      expect(ProductsFetchWorker).toHaveBeenCalled();
    });
  });

  describe('startScheduler', () => {
    it('should start scheduler successfully', async () => {
      // Setup mocks
      vi.mocked(mockProductsFetchQueue.scheduleProductsFetch).mockResolvedValue(undefined);

      const result = await schedulerService.startScheduler();

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(StatusCodes.OK);
      expect(result.message).toBe('Scheduler service started successfully');
      expect(mockProductsFetchQueue.scheduleProductsFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerError when queue scheduling fails', async () => {
      // Setup mocks
      const error = new Error('Queue scheduling failed');
      vi.mocked(mockProductsFetchQueue.scheduleProductsFetch).mockRejectedValue(error);

      await expect(schedulerService.startScheduler()).rejects.toThrow(InternalServerError);
      await expect(schedulerService.startScheduler()).rejects.toThrow(
        'Failed to start scheduler service',
      );
    });

    it('should handle unknown errors during start', async () => {
      // Setup mocks
      const error = 'Unknown error';
      vi.mocked(mockProductsFetchQueue.scheduleProductsFetch).mockRejectedValue(error);

      await expect(schedulerService.startScheduler()).rejects.toThrow(InternalServerError);
    });
  });

  describe('stopScheduler', () => {
    it('should stop scheduler successfully', async () => {
      // Setup mocks
      vi.mocked(mockProductsFetchWorker.close).mockResolvedValue(undefined);
      vi.mocked(mockProductsFetchQueue.close).mockResolvedValue(undefined);

      const result = await schedulerService.stopScheduler();

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(StatusCodes.OK);
      expect(result.message).toBe('Scheduler service stopped successfully');
      expect(mockProductsFetchWorker.close).toHaveBeenCalledTimes(1);
      expect(mockProductsFetchQueue.close).toHaveBeenCalledTimes(1);
    });

    it('should close worker before queue', async () => {
      // Setup mocks
      const closeOrder: string[] = [];
      vi.mocked(mockProductsFetchWorker.close).mockImplementation(async () => {
        closeOrder.push('worker');
      });
      vi.mocked(mockProductsFetchQueue.close).mockImplementation(async () => {
        closeOrder.push('queue');
      });

      await schedulerService.stopScheduler();

      expect(closeOrder).toEqual(['worker', 'queue']);
    });

    it('should throw InternalServerError when worker close fails', async () => {
      // Setup mocks
      const error = new Error('Worker close failed');
      vi.mocked(mockProductsFetchWorker.close).mockRejectedValue(error);

      await expect(schedulerService.stopScheduler()).rejects.toThrow(InternalServerError);
      await expect(schedulerService.stopScheduler()).rejects.toThrow(
        'Failed to stop scheduler service',
      );
    });

    it('should throw InternalServerError when queue close fails', async () => {
      // Setup mocks
      vi.mocked(mockProductsFetchWorker.close).mockResolvedValue(undefined);
      const error = new Error('Queue close failed');
      vi.mocked(mockProductsFetchQueue.close).mockRejectedValue(error);

      await expect(schedulerService.stopScheduler()).rejects.toThrow(InternalServerError);
      await expect(schedulerService.stopScheduler()).rejects.toThrow(
        'Failed to stop scheduler service',
      );
    });

    it('should handle unknown errors during stop', async () => {
      // Setup mocks
      vi.mocked(mockProductsFetchWorker.close).mockResolvedValue(undefined);
      const error = 'Unknown error';
      vi.mocked(mockProductsFetchQueue.close).mockRejectedValue(error);

      await expect(schedulerService.stopScheduler()).rejects.toThrow(InternalServerError);
    });
  });

  describe('integration scenarios', () => {
    it('should handle start and stop sequence correctly', async () => {
      // Setup mocks
      vi.mocked(mockProductsFetchQueue.scheduleProductsFetch).mockResolvedValue(undefined);
      vi.mocked(mockProductsFetchWorker.close).mockResolvedValue(undefined);
      vi.mocked(mockProductsFetchQueue.close).mockResolvedValue(undefined);

      // Start scheduler
      const startResult = await schedulerService.startScheduler();
      expect(startResult.success).toBe(true);

      // Stop scheduler
      const stopResult = await schedulerService.stopScheduler();
      expect(stopResult.success).toBe(true);

      // Verify call order
      expect(mockProductsFetchQueue.scheduleProductsFetch).toHaveBeenCalledTimes(1);
      expect(mockProductsFetchWorker.close).toHaveBeenCalledTimes(1);
      expect(mockProductsFetchQueue.close).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple start calls on same instance', async () => {
      // Setup mocks
      vi.mocked(mockProductsFetchQueue.scheduleProductsFetch).mockResolvedValue(undefined);

      // Multiple start calls
      await schedulerService.startScheduler();
      await schedulerService.startScheduler();

      expect(mockProductsFetchQueue.scheduleProductsFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple stop calls on same instance', async () => {
      // Setup mocks
      vi.mocked(mockProductsFetchWorker.close).mockResolvedValue(undefined);
      vi.mocked(mockProductsFetchQueue.close).mockResolvedValue(undefined);

      // Multiple stop calls
      await schedulerService.stopScheduler();
      await schedulerService.stopScheduler();

      expect(mockProductsFetchWorker.close).toHaveBeenCalledTimes(2);
      expect(mockProductsFetchQueue.close).toHaveBeenCalledTimes(2);
    });
  });
});
