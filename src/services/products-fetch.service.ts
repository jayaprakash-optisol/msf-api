import { db } from '../config/database.config';
import { getRedisClient } from '../config/redis.config';
import { products } from '../models';
import {
  NewProduct,
  ProductsApiResponse,
  ProductsFetchOptions,
  type ServiceResponse,
  IProductsFetchService,
  ApiProductItem,
} from '../types';
import { _ok, getEnv, handleServiceError, productsResponse, logger } from '../utils';

export class ProductsFetchService implements IProductsFetchService {
  private static instance: ProductsFetchService;
  private readonly baseUrl = getEnv('PRODUCTS_API_URL');
  private readonly redis = getRedisClient();
  private readonly LAST_UPDATE_KEY = 'product_sync:last_update_date';

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
   * Get the last update date from Redis
   * @returns Last update date or null if not found
   */
  async getLastUpdateDate(): Promise<Date | null> {
    try {
      const lastUpdateStr = await this.redis.get(this.LAST_UPDATE_KEY);
      if (lastUpdateStr) {
        return new Date(lastUpdateStr);
      }
      return null;
    } catch (error) {
      logger.error('Error retrieving last update date from Redis:', error);
      return null;
    }
  }

  /**
   * Set the last update date in Redis
   * @param date - The date to set as last update
   */
  async setLastUpdateDate(date: Date): Promise<void> {
    try {
      await this.redis.set(this.LAST_UPDATE_KEY, date.toISOString());
      logger.info(`Set last update date to: ${date.toISOString()}`);
    } catch (error) {
      logger.error('Error setting last update date in Redis:', error);
      throw error;
    }
  }

  /**
   * Build filter string with date filtering for most recent updates
   * @param lastUpdateDate - Last update date to filter from
   * @param productType - Product type filter (default: MED)
   * @returns Formatted filter string
   */
  buildDateFilter(lastUpdateDate: Date | null, productType: string = 'MED'): string {
    const typeFilter = `(type="${productType}")`;

    if (lastUpdateDate) {
      const dateStr = lastUpdateDate.toISOString();
      const dateFilter = `(date-greater-or-equal(./metaData/mostRecentUpdate,'${dateStr}'))`;
      return `${typeFilter} and ${dateFilter}`;
    }

    return typeFilter;
  }

  /**
   * Insert fetched product data into products table
   * @param productData - Array of product data from the API
   * @returns Number of records inserted
   */
  async insertProductsData(productData: ApiProductItem[]): Promise<number> {
    console.log('productData', productData);
    try {
      if (!productData.length) {
        return 0;
      }

      const mappedProducts: NewProduct[] = productData.map(item => ({
        unidataId: item.id,
        productCode: item.code,
        productDescription: item.description,
        type: item.type,
        state: item.state,
        standardizationLevel: item.standardizationLevel,
        freeCode: item.freeCode,
        labels: item.labels,
        sourceSystem: 'UNIDATA',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      return await db.transaction(async tx => {
        await tx
          .insert(products)
          .values(mappedProducts)
          .onConflictDoUpdate({
            target: products.productCode,
            set: {
              unidataId: products.unidataId,
              productDescription: products.productDescription,
              type: products.type,
              state: products.state,
              standardizationLevel: products.standardizationLevel,
              freeCode: products.freeCode,
              formerCodes: products.formerCodes,
              labels: products.labels,
              updatedAt: new Date(),
            },
          });

        return mappedProducts.length;
      });
    } catch (error) {
      throw handleServiceError(
        error,
        `${productsResponse.errors.insertFailed}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Fetch products from MSF API with date-based filtering
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
      url.searchParams.append('page', options.page.toString());

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
      return _ok(data, productsResponse.success.fetchSuccess);
    } catch (error) {
      throw handleServiceError(
        error,
        `${productsResponse.errors.fetchFailed}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Fetch products with automatic date filtering based on last sync
   * @param credentials - API credentials
   * @param options - Additional fetch options
   * @returns Service response with product data
   */
  async fetchProductsWithDateFilter(
    credentials: { login: string; password: string },
    options: { mode?: number; size?: number; productType?: string; page?: number } = {},
  ): Promise<ServiceResponse<ProductsApiResponse>> {
    try {
      // Get last update date from Redis
      const lastUpdateDate = await this.getLastUpdateDate();

      // If no last update date, start from a week ago as fallback
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() - 7);

      const filterDate = lastUpdateDate || fallbackDate;
      logger.info(`Fetching products updated after: ${filterDate.toISOString()}`);

      // Build filter with date constraint
      const filter = this.buildDateFilter(filterDate, options.productType);

      const fetchOptions: ProductsFetchOptions = {
        login: credentials.login,
        password: credentials.password,
        mode: options.mode ?? 7,
        size: options.size ?? 1000,
        filter,
        page: options.page ?? 1,
      };

      // Fetch products with the date filter
      const result = await this.fetchProducts(fetchOptions);

      // If successful and we have data, update the last sync date
      if (result.success && result.data?.rows?.length) {
        const now = new Date();
        await this.setLastUpdateDate(now);
        logger.info(
          `Successfully fetched ${result.data.rows.length} products and updated last sync date`,
        );
      }

      return result;
    } catch (error) {
      logger.error('Error in fetchProductsWithDateFilter:', error);
      throw error;
    }
  }
}
