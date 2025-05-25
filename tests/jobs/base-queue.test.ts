import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest';
import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import { BaseQueue, BaseJobData } from '../../src/jobs';
import env from '../../src/config/env.config';

// Mock the Queue class from bullmq
vi.mock('bullmq', () => {
  const mockAdd = vi.fn();
  const mockClose = vi.fn();

  return {
    Queue: vi.fn().mockImplementation(() => ({
      add: mockAdd,
      close: mockClose,
    })),
  };
});

// Create a concrete implementation of the abstract BaseQueue class for testing
class TestQueue extends BaseQueue {
  constructor(options?: Partial<QueueOptions>) {
    super('test-queue', options);
  }
}

describe('BaseQueue', () => {
  let queue: TestQueue;
  let mockQueue: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create the mock queue before creating the TestQueue
    mockQueue = {
      add: vi.fn(),
      close: vi.fn(),
    };

    // Update the Queue mock to return our mockQueue
    (Queue as unknown as MockedFunction<any>).mockReturnValue(mockQueue);

    queue = new TestQueue();

    // Ensure the queue property is set to our mockQueue
    (queue as any).queue = mockQueue;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize the queue with the correct options', () => {
      expect(Queue).toHaveBeenCalledWith('test-queue', {
        connection: {
          host: env.REDIS_HOST,
          port: Number(env.REDIS_PORT),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      });
    });

    it('should merge custom options with default options', () => {
      const customOptions: Partial<QueueOptions> = {
        defaultJobOptions: {
          attempts: 5,
        },
      };

      const customQueue = new TestQueue(customOptions);

      // Verify that Queue was called with the custom options
      expect(Queue).toHaveBeenCalledTimes(2);

      // The second call should be for the custom queue
      const mockCalls = (Queue as unknown as MockedFunction<any>).mock.calls;
      const secondCallOptions = mockCalls[1][1] as QueueOptions;
      expect(secondCallOptions.defaultJobOptions?.attempts).toBe(5);
    });
  });

  describe('addJob', () => {
    it('should add a job to the queue with the correct parameters', async () => {
      const jobName = 'test-job';
      const jobData: BaseJobData = { timestamp: new Date().toISOString() };
      const options: JobsOptions = { delay: 1000 };

      await queue.addJob(jobName, jobData, options);

      expect(mockQueue.add).toHaveBeenCalledWith(jobName, jobData, options);
    });

    it('should add a job without options', async () => {
      const jobName = 'test-job';
      const jobData: BaseJobData = { timestamp: new Date().toISOString() };

      await queue.addJob(jobName, jobData);

      expect(mockQueue.add).toHaveBeenCalledWith(jobName, jobData, undefined);
    });
  });

  describe('addRepeatingJob', () => {
    it('should add a repeating job with the correct interval', async () => {
      const jobName = 'repeating-job';
      const jobData: BaseJobData = { timestamp: new Date().toISOString() };
      const intervalMs = 60000;

      await queue.addRepeatingJob(jobName, jobData, intervalMs);

      expect(mockQueue.add).toHaveBeenCalledWith(jobName, jobData, {
        repeat: {
          every: intervalMs,
        },
      });
    });
  });

  describe('close', () => {
    it('should close the queue', async () => {
      await queue.close();

      expect(mockQueue.close).toHaveBeenCalled();
    });
  });

  describe('getQueue', () => {
    it('should return the queue instance', () => {
      const result = queue.getQueue();

      expect(result).toBe(mockQueue);
    });
  });
});
