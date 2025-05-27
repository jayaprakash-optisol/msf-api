import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest';
import {
  ProductsFetchQueue,
  ProductsFetchJobData,
} from '../../../src/jobs';
import { BaseQueue } from '../../../src/jobs';
import { logger, getEnv } from '../../../src/utils';

// Mock the BaseQueue class
vi.mock('../../../src/jobs/base-queue', () => {
  return {
    BaseQueue: vi.fn(),
  };
});

// Mock the logger and getEnv utility function
vi.mock('../../../src/utils', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  getEnv: vi.fn().mockImplementation((key: string) => {
    if (key === 'PRODUCT_SYNC_INTERVAL') {
      return 3600000; // 1 hour in milliseconds
    }
    return undefined;
  }),
}));

describe('ProductsFetchQueue', () => {
  let queue: ProductsFetchQueue;
  let mockAddRepeatingJob: MockedFunction<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new ProductsFetchQueue();
    mockAddRepeatingJob = vi.fn().mockResolvedValue(undefined);
    queue.addRepeatingJob = mockAddRepeatingJob;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with the correct queue name', () => {
      expect(BaseQueue).toHaveBeenCalledWith('products-fetch-queue');
    });
  });

  describe('scheduleProductsFetch', () => {
    it('should add a repeating job with the correct parameters', async () => {
      await queue.scheduleProductsFetch();

      // Verify that addRepeatingJob was called with the correct parameters
      expect(mockAddRepeatingJob).toHaveBeenCalledWith(
        'fetch-products',
        expect.objectContaining({
          timestamp: expect.any(String),
          mode: 7,
          size: 5,
          filter: 'type="MED"',
        }),
        getEnv('PRODUCT_SYNC_INTERVAL'),
      );

      // Verify that the timestamp is a valid ISO string
      const jobData = mockAddRepeatingJob.mock.calls[0][1] as ProductsFetchJobData;
      expect(() => new Date(jobData.timestamp)).not.toThrow();

      // Verify that the logger.info was called
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled products fetch job'),
      );
    });

    it('should log a message after scheduling the job', async () => {
      await queue.scheduleProductsFetch();

      expect(logger.info).toHaveBeenCalledWith(
        '✅ Scheduled products fetch job to run every 1 hour',
      );
    });
  });
});
