import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Job } from 'bullmq';
import { ProductsFetchWorker } from '../../../src/jobs';
import { BaseWorker } from '../../../src/jobs';
import { ProductsFetchService } from '../../../src/services';
import { ProductsFetchJobData } from '../../../src/jobs';
import { logger } from '../../../src/utils';

// Mock the BaseWorker class
vi.mock('../../../src/jobs/base-worker', () => {
  return {
    BaseWorker: vi.fn().mockImplementation(() => ({})),
  };
});

// Mock the ProductsFetchService
vi.mock('../../../src/services/products-fetch.service', () => {
  const mockFetchProducts = vi.fn();
  const mockInsertProductsData = vi.fn();

  const mockInstance = {
    fetchProducts: mockFetchProducts,
    insertProductsData: mockInsertProductsData,
  };

  return {
    ProductsFetchService: {
      getInstance: vi.fn().mockReturnValue(mockInstance),
    },
  };
});

// Mock the logger
vi.mock('../../../src/utils', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the env
vi.mock('process', () => {
  return {
    env: {
      API_USER_NAME: 'test-user',
      API_PASSWORD: 'test-password',
    },
  };
});

describe('ProductsFetchWorker', () => {
  let worker: ProductsFetchWorker;
  let mockProductsFetchService: any;
  let mockJob: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mock service instance before creating the worker
    mockProductsFetchService = {
      fetchProducts: vi.fn(),
      insertProductsData: vi.fn(),
    };

    // Update the mock to return our instance
    (ProductsFetchService.getInstance as jest.Mock).mockReturnValue(mockProductsFetchService);

    // Create the worker after setting up the mock
    worker = new ProductsFetchWorker();

    // Create a mock job
    mockJob = {
      id: 'test-job-id',
      data: {
        timestamp: new Date().toISOString(),
        mode: 7,
        size: 5,
        filter: 'type="MED"',
      } as ProductsFetchJobData,
      log: vi.fn().mockResolvedValue(undefined),
      updateProgress: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with the correct queue name and concurrency', () => {
      expect(BaseWorker).toHaveBeenCalledWith('products-fetch-queue', 1);
    });

    it('should get an instance of ProductsFetchService', () => {
      expect(ProductsFetchService.getInstance).toHaveBeenCalled();
    });
  });

  describe('processJob', () => {
    it('should process a job successfully', async () => {
      // Mock the fetchProducts method to return a successful response
      mockProductsFetchService.fetchProducts.mockResolvedValueOnce({
        data: {
          data: [{ id: 1 }, { id: 2 }],
          rows: [{ id: 1 }, { id: 2 }],
        },
      });

      // Call the processJob method
      // @ts-ignore - accessing protected method for testing
      await worker.processJob(mockJob as Job<ProductsFetchJobData>);

      // Verify that the job methods were called
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Processing products fetch job'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Job data:'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(30);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Starting products fetch'));

      // Verify that the service methods were called with the correct parameters
      expect(mockProductsFetchService.fetchProducts).toHaveBeenCalledWith({
        login: 'test-user',
        password: 'test-password',
        mode: 7,
        size: 5,
        filter: 'type="MED"',
      });

      expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Successfully fetched 2 products'));

      // Verify that insertProductsData was called with the correct parameters
      expect(mockProductsFetchService.insertProductsData).toHaveBeenCalledWith([
        { id: 1 },
        { id: 2 },
      ]);

      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Successfully inserted 2 products'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Products fetch job completed successfully'));
    });

    it('should handle case when no products are returned', async () => {
      // Mock the fetchProducts method to return an empty response
      mockProductsFetchService.fetchProducts.mockResolvedValueOnce({
        data: {
          data: [],
          rows: [],
        },
      });

      // Call the processJob method
      // @ts-ignore - accessing protected method for testing
      await worker.processJob(mockJob as Job<ProductsFetchJobData>);

      // Verify that the job methods were called
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Processing products fetch job'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Job data:'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(30);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Starting products fetch'));

      // Verify that the service methods were called
      expect(mockProductsFetchService.fetchProducts).toHaveBeenCalled();

      expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Successfully fetched 0 products'));

      // Verify that insertProductsData was not called
      expect(mockProductsFetchService.insertProductsData).not.toHaveBeenCalled();

      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('No products to insert'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Products fetch job completed successfully'));
    });

    it('should handle errors during job processing', async () => {
      // Mock the fetchProducts method to throw an error
      const error = new Error('API error');
      mockProductsFetchService.fetchProducts.mockRejectedValueOnce(error);

      // Call the processJob method and expect it to throw
      await expect(
        // @ts-ignore - accessing protected method for testing
        worker.processJob(mockJob as Job<ProductsFetchJobData>)
      ).rejects.toThrow('API error');

      // Verify that the job methods were called
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Processing products fetch job'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Job data:'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(30);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Starting products fetch'));

      // Verify that the error was logged
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error processing products fetch job'));
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Error processing products fetch job'));
    });

    it('should handle missing API credentials', async () => {
      // Save the original env mock
      const originalEnv = process.env;

      // Override the env for this test
      Object.defineProperty(process, 'env', {
        value: {
          API_USER_NAME: undefined,
          API_PASSWORD: undefined,
        },
        writable: true
      });

      // Create a new worker with the updated env
      const newWorker = new ProductsFetchWorker();

      // Setup the mock service for the new worker
      const newMockService = {
        fetchProducts: vi.fn().mockResolvedValue({
          data: {
            data: [{ id: 1 }],
            rows: [{ id: 1 }],
          },
        }),
        insertProductsData: vi.fn(),
      };

      // Assign the mock service to the worker
      (newWorker as any).productsFetchService = newMockService;

      // Call the processJob method with the new worker
      // @ts-ignore - accessing protected method for testing
      await newWorker.processJob(mockJob as Job<ProductsFetchJobData>);

      // Verify that the service methods were called
      expect(newMockService.fetchProducts).toHaveBeenCalled();

      // Restore the original env
      Object.defineProperty(process, 'env', {
        value: originalEnv,
        writable: true
      });
    });

    it('should handle null data in API response', async () => {
      // Mock the fetchProducts method to return a response with null data
      mockProductsFetchService.fetchProducts.mockResolvedValueOnce({
        data: null,
      });

      // Call the processJob method
      // @ts-ignore - accessing protected method for testing
      await worker.processJob(mockJob as Job<ProductsFetchJobData>);

      // Verify that the job methods were called
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Processing products fetch job'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Job data:'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(30);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Starting products fetch'));

      // Verify that the service methods were called
      expect(mockProductsFetchService.fetchProducts).toHaveBeenCalled();

      expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Successfully fetched 0 products'));

      // Verify that insertProductsData was not called
      expect(mockProductsFetchService.insertProductsData).not.toHaveBeenCalled();

      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('No products to insert'));
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
      expect(mockJob.log).toHaveBeenCalledWith(expect.stringContaining('Products fetch job completed successfully'));
    });
  });
});
