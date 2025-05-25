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

// Mock database
vi.mock('../../src/config/database.config', () => ({
  db: {
    insert: vi.fn(),
  },
}));

// Mock environment config
vi.mock('../../src/config/env.config', () => ({
  default: {
    PRODUCTS_API_URL: 'https://api.test.com/products',
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
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const result = await productsFetchService.insertProductsData(mockApiProductItems);

      expect(result).toBe(2);
      expect(db.insert).toHaveBeenCalledTimes(1);
      expect(db.insert).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should return 0 for empty product data', async () => {
      const result = await productsFetchService.insertProductsData([]);

      expect(result).toBe(0);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should return 0 for null product data', async () => {
      const result = await productsFetchService.insertProductsData(null as any);

      expect(result).toBe(0);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should return 0 for undefined product data', async () => {
      const result = await productsFetchService.insertProductsData(undefined as any);

      expect(result).toBe(0);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should throw InternalServerError when database insertion fails', async () => {
      // Setup mocks
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      await expect(productsFetchService.insertProductsData(mockApiProductItems)).rejects.toThrow(
        InternalServerError,
      );
    });

    it('should handle non-Error objects in error handling', async () => {
      // Setup mocks with a non-Error object
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockRejectedValue('String error'),
      } as any);

      await expect(productsFetchService.insertProductsData(mockApiProductItems)).rejects.toThrow(
        InternalServerError,
      );
      await expect(productsFetchService.insertProductsData(mockApiProductItems)).rejects.toThrow(
        'Unknown error'
      );
    });

    it('should map API product items correctly', async () => {
      // Setup mocks
      const mockValues = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any);

      await productsFetchService.insertProductsData(mockApiProductItems);

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
      const url = new URL(calledUrl);

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
        'Unknown error'
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
