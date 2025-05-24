import env from '../config/env.config';
import { type ServiceResponse } from '../types';
import { _ok, handleServiceError, logger } from '../utils';

export interface ProductsApiResponse {
  data: unknown[];
  total: number;
  page: number;
  size: number;
}

export interface ProductsFetchOptions {
  login: string;
  password: string;
  mode: number;
  size: number;
  filter: string;
}

export class ProductsFetchService {
  private static instance: ProductsFetchService;
  private readonly baseUrl = env.PRODUCTS_API_URL;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ProductsFetchService {
    if (!ProductsFetchService.instance) {
      ProductsFetchService.instance = new ProductsFetchService();
    }
    return ProductsFetchService.instance;
  }

  /**
   * Fetch products from MSF API
   * @param options - API request options
   * @returns A service response containing the products data
   */
  async fetchProducts(
    options: ProductsFetchOptions,
  ): Promise<ServiceResponse<ProductsApiResponse>> {
    try {
      const url = new URL(this.baseUrl);

      // Add query parameters
      url.searchParams.append('login', options.login);
      url.searchParams.append('password', options.password);
      url.searchParams.append('mode', options.mode.toString());
      url.searchParams.append('size', options.size.toString());
      url.searchParams.append('filter', options.filter);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logger.info(`✅ Successfully fetched ${data?.rows?.length ?? 0} products`);

      return _ok(data, 'Products fetched successfully');
    } catch (error) {
      logger.error('❌ Error fetching products:', error);
      throw handleServiceError(
        error,
        `Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
