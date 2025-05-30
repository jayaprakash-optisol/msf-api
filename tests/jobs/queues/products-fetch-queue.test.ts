import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductsFetchQueue } from '../../../src/jobs/queues/products-fetch-queue';
import { Queue } from 'bullmq';

// Mock bullmq
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock utils
vi.mock('../../../src/utils', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  getEnv: vi.fn(),
}));

// Mock common utils
vi.mock('../../../src/utils/common.utils', () => ({
  parseRepeatInterval: vi.fn().mockReturnValue({ every: 3600000 }),
}));

describe('ProductsFetchQueue', () => {
  let queue: ProductsFetchQueue;
  let mockQueueInstance: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.resetAllMocks();

    // Create mock queue instance
    mockQueueInstance = {
      add: vi.fn().mockResolvedValue(undefined),
    };

    // Set up Queue constructor mock
    vi.mocked(Queue).mockImplementation(() => mockQueueInstance as any);

    // Create queue instance
    queue = new ProductsFetchQueue();
  });

  it('should initialize with the correct queue name', () => {
    expect(Queue).toHaveBeenCalledWith('products-fetch-queue', expect.any(Object));
  });

  it('should add a job to the queue when scheduling products fetch', async () => {
    // Import dependencies directly to access the mocks
    const { getEnv } = await import('../../../src/utils');
    const { parseRepeatInterval } = await import('../../../src/utils/common.utils');

    // Setup mocks
    vi.mocked(getEnv).mockReturnValue('1 hour');
    vi.mocked(parseRepeatInterval).mockReturnValue({ every: 3600000 });

    // Call the method
    await queue.scheduleProductsFetch();

    // Verify queue.add was called with the correct job name and options
    expect(mockQueueInstance.add).toHaveBeenCalledWith(
      'fetch-products',
      expect.objectContaining({
        timestamp: expect.any(String),
        mode: 7,
        size: 1000,
      }),
      expect.objectContaining({
        repeat: expect.any(Object),
      })
    );
  });

  it('should log a message after scheduling the job', async () => {
    // Import logger directly to access the mock
    const { logger } = await import('../../../src/utils');
    const { getEnv } = await import('../../../src/utils');

    // Setup mocks
    vi.mocked(getEnv).mockReturnValue('1 hour');

    // Call the method
    await queue.scheduleProductsFetch();

    // Verify logger.info was called with the correct message
    expect(logger.info).toHaveBeenCalledWith('✅ Scheduled products fetch job with date-based filtering');
  });
});
