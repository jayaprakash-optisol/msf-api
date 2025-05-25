import env from '../config/env.config';
import { db } from '../config/database.config';
import { products } from '../models';
import {
  NewProduct,
  ProductsApiResponse,
  ProductsFetchOptions,
  type ServiceResponse,
  IProductsFetchService,
  ApiProductItem,
} from '../types';
import { _ok, handleServiceError, logger, productsResponse } from '../utils';

export class ProductsFetchService implements IProductsFetchService {
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
   * Insert fetched product data into products table
   * @param productData - Array of product data from the API
   * @returns Number of records inserted
   */
  async insertProductsData(productData: ApiProductItem[]): Promise<number> {
    try {
      if (!productData || productData.length === 0) {
        logger.info(productsResponse.success.noDataToInsert);
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

      await db.insert(products).values(mappedProducts);
      logger.info(`✅ Successfully inserted ${mappedProducts.length} products into database`);

      return mappedProducts.length;
    } catch (error) {
      logger.error('❌ Error inserting products data:', error);
      throw handleServiceError(
        error,
        `${productsResponse.errors.insertFailed}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
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
      return _ok(data, productsResponse.success.fetchSuccess);
    } catch (error) {
      logger.error('❌ Error fetching products:', error);
      throw handleServiceError(
        error,
        `${productsResponse.errors.fetchFailed}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
