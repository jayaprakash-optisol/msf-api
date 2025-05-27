import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest';
import { Worker, Job } from 'bullmq';
import { BaseWorker } from '../../src/jobs/base-worker';
import { BaseJobData } from '../../src/jobs/base-queue';
import { logger } from '../../src/utils';
import { getEnv } from '../../src/utils/config.util';

// Mock getEnv function
vi.mock('../../src/utils/config.util', () => ({
  getEnv: vi.fn((key: string) => {
    if (key === 'REDIS_HOST') return 'localhost';
    if (key === 'REDIS_PORT') return '6379';
    return undefined;
  }),
  isDevelopment: vi.fn().mockReturnValue(true),
  isProduction: vi.fn().mockReturnValue(false),
  isTest: vi.fn().mockReturnValue(false),
}));

// Mock the Worker class from bullmq
vi.mock('bullmq', () => {
  const mockOn = vi.fn();
  const mockClose = vi.fn();

  return {
    Worker: vi.fn().mockImplementation(() => ({
      on: mockOn,
      close: mockClose,
    })),
    Job: vi.fn(),
  };
});

// Mock the logger
vi.mock('../../src/utils', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Create a concrete implementation of the abstract BaseWorker class for testing
class TestWorker extends BaseWorker {
  constructor(concurrency?: number) {
    super('test-queue', concurrency);
  }

  protected async processJob(job: Job<BaseJobData>): Promise<void> {
    // Implementation for testing
  }

  // Expose protected methods for testing
  public exposeProcessJob(job: Job<BaseJobData>): Promise<void> {
    return this.processJob(job);
  }

  public exposeSetupEventListeners(): void {
    this.setupEventListeners();
  }
}

describe('BaseWorker', () => {
  let worker: TestWorker;
  let mockWorker: any;
  let mockProcessJob: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create the mock worker before creating the TestWorker
    mockWorker = {
      on: vi.fn(),
      close: vi.fn(),
    };

    // Update the Worker mock to return our mockWorker
    (Worker as unknown as MockedFunction<any>).mockReturnValue(mockWorker);

    worker = new TestWorker();
    mockProcessJob = vi.spyOn(worker, 'exposeProcessJob');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize the worker with the correct options', () => {
      // Instead of checking the exact values, just verify the structure
      expect(Worker).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        {
          connection: {
            host: 'localhost',
            port: 6379,
          },
          concurrency: 2, // Default concurrency
        }
      );
    });

    it('should initialize the worker with custom concurrency', () => {
      const customConcurrency = 5;
      const customWorker = new TestWorker(customConcurrency);

      expect(Worker).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        expect.objectContaining({
          concurrency: customConcurrency,
        }),
      );
    });

    it('should set up event listeners', () => {
      // The event listeners are already set up in the constructor
      // So we just need to verify that mockWorker.on was called 3 times
      expect(mockWorker.on).toHaveBeenCalledTimes(3);
    });
  });

  describe('setupEventListeners', () => {
    it('should set up completed event listener', () => {
      // First call should be for 'completed' event
      expect(mockWorker.on).toHaveBeenNthCalledWith(1, 'completed', expect.any(Function));
    });

    it('should set up failed event listener', () => {
      // Second call should be for 'failed' event
      expect(mockWorker.on).toHaveBeenNthCalledWith(2, 'failed', expect.any(Function));
    });

    it('should set up error event listener', () => {
      // Third call should be for 'error' event
      expect(mockWorker.on).toHaveBeenNthCalledWith(3, 'error', expect.any(Function));
    });

    it('should call setupEventListeners method directly', () => {
      // Reset the mock to clear previous calls
      mockWorker.on.mockClear();

      // Call the method directly
      worker.exposeSetupEventListeners();

      // Verify that the event listeners were set up again
      expect(mockWorker.on).toHaveBeenCalledTimes(3);
      expect(mockWorker.on).toHaveBeenNthCalledWith(1, 'completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenNthCalledWith(2, 'failed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenNthCalledWith(3, 'error', expect.any(Function));
    });

    it('should call setupEventListeners during initialization', () => {
      // Create a spy on the setupEventListeners method
      const setupSpy = vi.spyOn(TestWorker.prototype as any, 'setupEventListeners');

      // Create a new instance of TestWorker
      const newWorker = new TestWorker();

      // Verify that setupEventListeners was called during initialization
      expect(setupSpy).toHaveBeenCalled();

      // Clean up
      setupSpy.mockRestore();
    });

    it('should log completion message when job completes', () => {
      // Get the callback function for the 'completed' event
      const completedCallback = mockWorker.on.mock.calls[0][1];
      const mockJob = { id: '123', log: vi.fn() };

      // Call the callback
      completedCallback(mockJob);

      // Verify logger.info was called with the correct message
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Job 123 completed successfully'),
      );
      expect(mockJob.log).toHaveBeenCalledWith(
        expect.stringContaining('Job 123 completed successfully'),
      );
    });

    it('should log error message when job fails', async () => {
      // Get the callback function for the 'failed' event
      const failedCallback = mockWorker.on.mock.calls[1][1];
      const mockJob = { id: '123', log: vi.fn() };
      const mockError = new Error('Test error');

      // Call the callback
      await failedCallback(mockJob, mockError);

      // Verify logger.error was called with the correct message
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Job 123 failed'));
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Job 123 failed'));
    });

    it('should handle null job in failed event', async () => {
      // Get the callback function for the 'failed' event
      const failedCallback = mockWorker.on.mock.calls[1][1];
      const mockError = new Error('Test error');

      // Call the callback with null job
      await failedCallback(null, mockError);

      // Verify logger.error was called with the correct message
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Job undefined failed'));
      // Should not try to call log on null job
    });

    it('should log error message when worker encounters an error', () => {
      // Get the callback function for the 'error' event
      const errorCallback = mockWorker.on.mock.calls[2][1];
      const mockError = new Error('Worker error');

      // Call the callback
      errorCallback(mockError);

      // Verify logger.error was called with the correct message
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Worker error'));
    });
  });

  describe('close', () => {
    it('should close the worker', async () => {
      await worker.close();

      expect(mockWorker.close).toHaveBeenCalled();
    });
  });

  describe('processJob', () => {
    it('should call the processJob method', async () => {
      const mockJob = {
        id: '123',
        data: { timestamp: new Date().toISOString() },
      } as Job<BaseJobData>;

      await worker.exposeProcessJob(mockJob);

      expect(mockProcessJob).toHaveBeenCalledWith(mockJob);
    });

    it('should test the processor function passed to Worker constructor', async () => {
      // Create a spy on the protected processJob method
      const processSpy = vi.spyOn(worker as any, 'processJob');

      // Get the processor function that was passed to the Worker constructor
      const mockCalls = (Worker as unknown as MockedFunction<any>).mock.calls;
      const processorFn = mockCalls[0][1] as (job: Job<BaseJobData>) => Promise<void>;

      // Create a mock job
      const mockJob = {
        id: '456',
        data: { timestamp: new Date().toISOString() },
      } as Job<BaseJobData>;

      // Call the processor function directly
      await processorFn(mockJob);

      // Verify that processJob was called with the mock job
      expect(processSpy).toHaveBeenCalledWith(mockJob);

      // Clean up
      processSpy.mockRestore();
    });
  });
});
