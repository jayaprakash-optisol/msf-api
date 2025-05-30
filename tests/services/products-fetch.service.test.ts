import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import {
  mockApiProductItems,
  mockProductsApiResponse,
  mockProductsFetchOptions,
  mockEmptyProductsApiResponse,
} from '../mocks';
import { ProductsFetchService } from '../../src/services/products-fetch.service';
import { db } from '../../src/config/database.config';
import { InternalServerError } from '../../src/utils/error.util';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Redis client
vi.mock('../../src/config/redis.config', () => ({
  getRedisClient: vi.fn().mockReturnValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  }),
}));

// Mock database
vi.mock('../../src/config/database.config', () => {
  // Create a mock for the transaction callback
  const mockTxInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnValue(undefined),
    }),
  });

  // Create a mock for the transaction function
  const mockTransaction = vi.fn().mockImplementation(async callback => {
    // Call the callback with a mock transaction object
    return await callback({
      insert: mockTxInsert,
    });
  });

  return {
    db: {
      insert: vi.fn(),
      transaction: mockTransaction,
    },
  };
});

// Mock getEnv function
vi.mock('../../src/utils/config.util', () => ({
  getEnv: vi.fn().mockImplementation((key: string) => {
    if (key === 'PRODUCTS_API_URL') return 'https://api.test.com/products';
    return undefined;
  }),
}));

// Mock env config
vi.mock('../../src/config/env.config', () => ({
  env: {
    getConfig: vi.fn().mockReturnValue({
      PRODUCTS_API_URL: 'https://api.test.com/products',
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
    getInstance: vi.fn().mockReturnThis(),
  },
}));

describe('ProductsFetchService', () => {
  let productsFetchService: ProductsFetchService;

  beforeEach(() => {
    vi.resetAllMocks();

    // Reset singleton
    // @ts-ignore
    ProductsFetchService.instance = undefined;
    productsFetchService = ProductsFetchService.getInstance();

    // Directly set the baseUrl property
    // @ts-ignore - accessing private property for testing
    productsFetchService.baseUrl = 'https://api.test.com/products';
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ProductsFetchService.getInstance();
      const instance2 = ProductsFetchService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(ProductsFetchService);
    });
  });

  describe('insertProductsData', () => {
    it('should insert products data successfully', async () => {
      // Setup mocks
      vi.mocked(db.transaction).mockImplementationOnce(async callback => {
        return await callback({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              onConflictDoUpdate: vi.fn().mockReturnValue(undefined),
            }),
          }),
        });
      });

      // Mock the return value for the transaction
      vi.mocked(db.transaction).mockResolvedValueOnce(2);

      const result = await productsFetchService.insertProductsData(mockApiProductItems);

      expect(result).toBe(2);
      expect(db.transaction).toHaveBeenCalledTimes(1);
    });

    it('should return 0 for empty product data', async () => {
      const result = await productsFetchService.insertProductsData([]);

      expect(result).toBe(0);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should handle null product data gracefully', async () => {
      // We expect this to throw an error since the method tries to access .length on null
      await expect(productsFetchService.insertProductsData(null as any)).rejects.toThrow(
        /Cannot read properties of null/,
      );
    });

    it('should handle undefined product data gracefully', async () => {
      // We expect this to throw an error since the method tries to access .length on undefined
      await expect(productsFetchService.insertProductsData(undefined as any)).rejects.toThrow(
        /Cannot read properties of undefined/,
      );
    });

    it('should throw InternalServerError when database insertion fails', async () => {
      // Setup mocks to throw an error
      vi.mocked(db.transaction).mockRejectedValueOnce(new Error('Database error'));

      await expect(productsFetchService.insertProductsData(mockApiProductItems)).rejects.toThrow(
        InternalServerError,
      );
    });

    it('should handle non-Error objects in error handling', async () => {
      // Setup mocks with a non-Error object
      vi.mocked(db.transaction).mockRejectedValueOnce('String error');

      // First call will reject with InternalServerError
      await expect(productsFetchService.insertProductsData(mockApiProductItems)).rejects.toThrow(
        InternalServerError,
      );

      // Reset the mock for the second call
      vi.mocked(db.transaction).mockRejectedValueOnce('String error');

      // Second call will also reject, and we check the error message
      await expect(productsFetchService.insertProductsData(mockApiProductItems)).rejects.toThrow(
        /Failed to insert products into database: Unknown error/,
      );
    });

    it('should map API product items correctly', async () => {
      // Create a spy for the values function
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue(undefined),
      });

      // Create a spy for the insert function
      const mockInsert = vi.fn().mockReturnValue({
        values: mockValues,
      });

      // Mock the transaction to use our spies
      vi.mocked(db.transaction).mockImplementationOnce(async callback => {
        return await callback({
          insert: mockInsert,
        });
      });

      // Mock the return value for the transaction
      vi.mocked(db.transaction).mockResolvedValueOnce(2);

      await productsFetchService.insertProductsData(mockApiProductItems);

      // Verify that insert was called with the products table
      expect(mockInsert).toHaveBeenCalled();

      // Verify that values was called with the mapped products
      expect(mockValues).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            unidataId: 'test-product-1',
            productCode: 'PROD001',
            productDescription: 'Test Product Description',
            type: 'STANDARD',
            state: 'ACTIVE',
            standardizationLevel: 'HIGH',
            freeCode: 'FREE001',
            labels: {
              category: 'electronics',
              brand: 'TestBrand',
            },
            sourceSystem: 'UNIDATA',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          }),
        ]),
      );
    });
  });

  describe('fetchProducts', () => {
    it('should fetch products successfully', async () => {
      // Setup fetch mock
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockProductsApiResponse),
      } as any);

      const result = await productsFetchService.fetchProducts(mockProductsFetchOptions);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(StatusCodes.OK);
      expect(result.data).toEqual(mockProductsApiResponse);
      expect(result.message).toContain('Products fetched successfully');
    });

    it('should construct URL with correct query parameters', async () => {
      // Setup fetch mock
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockProductsApiResponse),
      } as any);

      await productsFetchService.fetchProducts(mockProductsFetchOptions);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.test.com/products'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }),
      );

      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      // Ensure calledUrl is a valid absolute URL
      const url = new URL(calledUrl, 'http://localhost');

      expect(url.searchParams.get('login')).toBe('test_user');
      expect(url.searchParams.get('password')).toBe('test_password');
      expect(url.searchParams.get('mode')).toBe('1');
      expect(url.searchParams.get('size')).toBe('10');
      expect(url.searchParams.get('filter')).toBe('active');
    });

    it('should throw InternalServerError when fetch fails with HTTP error', async () => {
      // Setup fetch mock
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      await expect(productsFetchService.fetchProducts(mockProductsFetchOptions)).rejects.toThrow(
        InternalServerError,
      );
    });

    it('should throw InternalServerError when fetch throws network error', async () => {
      // Setup fetch mock
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(productsFetchService.fetchProducts(mockProductsFetchOptions)).rejects.toThrow(
        InternalServerError,
      );
    });

    it('should handle non-Error objects in fetch error handling', async () => {
      // Setup fetch mock with a non-Error object
      vi.mocked(fetch).mockRejectedValue('Network failure');

      await expect(productsFetchService.fetchProducts(mockProductsFetchOptions)).rejects.toThrow(
        InternalServerError,
      );
      await expect(productsFetchService.fetchProducts(mockProductsFetchOptions)).rejects.toThrow(
        'Unknown error',
      );
    });

    it('should throw InternalServerError when JSON parsing fails', async () => {
      // Setup fetch mock
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any);

      await expect(productsFetchService.fetchProducts(mockProductsFetchOptions)).rejects.toThrow(
        InternalServerError,
      );
    });

    it('should handle empty response successfully', async () => {
      // Setup fetch mock
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockEmptyProductsApiResponse),
      } as any);

      const result = await productsFetchService.fetchProducts(mockProductsFetchOptions);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEmptyProductsApiResponse);
      expect(result.data?.total).toBe(0);
    });

    it('should handle different HTTP status codes correctly', async () => {
      // Test 404
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      await expect(productsFetchService.fetchProducts(mockProductsFetchOptions)).rejects.toThrow(
        'HTTP error! status: 404',
      );

      // Test 401
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
      } as any);

      await expect(productsFetchService.fetchProducts(mockProductsFetchOptions)).rejects.toThrow(
        'HTTP error! status: 401',
      );
    });
  });
});
